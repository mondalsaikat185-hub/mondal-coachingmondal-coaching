const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

// Ensure all newly created DB/WAL files have 600 permissions
process.umask(0o077);

const app = express();
const PORT = process.env.PORT || 4000;
const HMAC_SECRET = (process.env.HMAC_SYNC_SECRET || '').trim();
const SESSION_SECRET = (process.env.MC_SESSION_SECRET || '').trim();
const CLIENT_SECURITY_TOKEN = process.env.CLIENT_SECURITY_TOKEN || 'MondalCoachingSecureToken2026!';

// Data directory
const DATA_DIR = process.env.DATA_DIR || '/data';
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
}

// Database setup
const dbPath = path.join(DATA_DIR, 'mc.db');
const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA synchronous = NORMAL;');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS library (
    id TEXT PRIMARY KEY,
    item_json TEXT NOT NULL,
    summary_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    role TEXT NOT NULL,
    status TEXT NOT NULL,
    token_version INTEGER NOT NULL DEFAULT 1,
    user_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    payment_json TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_payments_student_id ON payments(student_id);
`);

// Prepared statements
const metaGetStmt = db.prepare('SELECT value FROM meta WHERE key = ?');
const metaSetStmt = db.prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
const libGetItemStmt = db.prepare('SELECT item_json FROM library WHERE id = ?');
const libCountStmt = db.prepare('SELECT COUNT(*) as count FROM library');
const userGetByIdStmt = db.prepare('SELECT id, role, status, token_version, user_json FROM users WHERE id = ?');
const userGetAllStmt = db.prepare('SELECT user_json FROM users');
const userCountStmt = db.prepare('SELECT COUNT(*) as count FROM users');
const paymentGetAllStmt = db.prepare('SELECT payment_json FROM payments');
const paymentGetByStudentStmt = db.prepare('SELECT payment_json FROM payments WHERE student_id = ?');
const paymentCountStmt = db.prepare('SELECT COUNT(*) as count FROM payments');

// Allowed CORS origins for session-authenticated endpoints
const ALLOWED_ORIGIN_REGEX = /^https:\/\/mondal-coachingmondal-coaching(-[a-z0-9]+)?\.vercel\.app$/i;
const ALLOWED_DEV_ORIGINS = new Set([
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173'
]);

function isOriginAllowed(origin) {
  if (!origin) return true; // server-to-server / curl
  if (ALLOWED_ORIGIN_REGEX.test(origin)) return true;
  if (ALLOWED_DEV_ORIGINS.has(origin)) return true;
  return false;
}

app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  allowedHeaders: ['Content-Type', 'X-MC-Token', 'X-MC-Session', 'Authorization'],
  methods: ['GET', 'POST', 'OPTIONS']
}));

// Enforce strict Origin check when X-MC-Session or Authorization header is sent from a browser
app.use((req, res, next) => {
  const hasSessionHeader = Boolean(req.headers['x-mc-session'] || req.headers['authorization']);
  const origin = req.headers['origin'];
  if (hasSessionHeader && origin && !isOriginAllowed(origin)) {
    return res.status(403).json({
      success: false,
      code: 403,
      error: 'Forbidden: Origin not allowed for session-authenticated request'
    });
  }
  next();
});

// Capture raw body for HMAC verification
app.use(express.json({
  limit: '50mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// Client Token Verification Middleware for GET endpoints (except /health)
function verifyClientToken(req, res, next) {
  const token = req.headers['x-mc-token'];
  if (!token || token !== CLIENT_SECURITY_TOKEN) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Missing or invalid X-MC-Token' });
  }
  next();
}

// Stateless Signed Session Verification Middleware (401 WITHOUT forceLogout so old v83 tokens fallback to GAS)
function verifySessionToken(req, res, next) {
  try {
    if (!SESSION_SECRET) {
      return res.status(503).json({ success: false, code: 503, error: 'Session secret not configured on VPS' });
    }
    const rawHeader = req.headers['x-mc-session'] || (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
    const token = String(rawHeader || '').trim();
    if (!token) {
      return res.status(401).json({ success: false, code: 401, error: 'Missing session token' });
    }

    const dotIdx = token.indexOf('.');
    if (dotIdx <= 0 || dotIdx === token.length - 1) {
      // Old v83 random hex token or malformed token -> 401 WITHOUT forceLogout so frontend falls back to GAS
      return res.status(401).json({ success: false, code: 401, error: 'Legacy or unsigned session token' });
    }

    const payloadB64 = token.substring(0, dotIdx);
    const sigHex = token.substring(dotIdx + 1).toLowerCase();

    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('hex').toLowerCase();
    if (sigHex.length !== expectedSig.length || !crypto.timingSafeEqual(Buffer.from(sigHex), Buffer.from(expectedSig))) {
      return res.status(401).json({ success: false, code: 401, error: 'Invalid session token signature' });
    }

    const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const payload = JSON.parse(payloadJson);
    if (!payload || !payload.userId || !payload.exp) {
      return res.status(401).json({ success: false, code: 401, error: 'Invalid session token payload' });
    }

    if (Date.now() >= Number(payload.exp)) {
      return res.status(401).json({ success: false, code: 401, error: 'Session token expired' });
    }

    const dbUser = userGetByIdStmt.get(String(payload.userId));
    if (!dbUser) {
      return res.status(401).json({ success: false, code: 401, error: 'User not found in VPS snapshot' });
    }

    const tokenVer = Number(payload.tv || 1);
    const dbTokenVer = Number(dbUser.token_version || 1);
    if (tokenVer !== dbTokenVer) {
      return res.status(401).json({ success: false, code: 401, error: 'Session token version revoked' });
    }

    if (dbUser.role !== 'admin' && String(dbUser.status).toLowerCase() !== 'active') {
      return res.status(401).json({ success: false, code: 401, error: 'User account is not active' });
    }

    req.session = {
      userId: dbUser.id,
      role: dbUser.role,
      status: dbUser.status,
      tokenVersion: dbTokenVer,
      userJson: dbUser.user_json
    };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, code: 401, error: 'Session verification failed' });
  }
}

// Strict Whitelist for User Snapshot Objects
const ALLOWED_USER_FIELDS = [
  'id', 'name', 'fullName', 'phone', 'email', 'role', 'status',
  'batchId', 'address', 'dob', 'joinDate', 'profilePhotoUrl',
  'monthlyFee', 'pendingMonths', 'exemptReason', 'paymentStatus',
  'createdAt', 'updatedAt', 'excusedDates', 'reapplyReason',
  'rejectReason', 'showPaymentNudge', 'tokenVersion'
];

function sanitizeUserForSnapshot(u) {
  const clean = {};
  for (const key of ALLOWED_USER_FIELDS) {
    if (u[key] !== undefined) {
      clean[key] = u[key];
    }
  }
  clean.tokenVersion = Number(u.tokenVersion || 1);
  return clean;
}

// Strict Whitelist for Payment Snapshot Objects (excludes proofImage content, includes hasProof flag)
const ALLOWED_PAYMENT_FIELDS = [
  'id', 'studentId', 'studentName', 'month', 'amount', 'status',
  'paidVia', 'paymentMode', 'transactionId', 'remarks', 'paidDate', 'createdAt'
];

function sanitizePaymentForSnapshot(p) {
  const clean = {};
  for (const key of ALLOWED_PAYMENT_FIELDS) {
    if (p[key] !== undefined) {
      clean[key] = p[key];
    }
  }
  const hasProof = Boolean(p.hasProof === true || (p.proofImage && String(p.proofImage).trim() !== ''));
  clean.hasProof = hasProof;
  clean.proofImage = '';
  return clean;
}

// Helper to format library summary
function formatLibrarySummary(item) {
  return {
    id: item.id || '',
    title: item.title || '',
    type: item.type || 'folder',
    parentId: item.parentId || null,
    isFolder: item.isFolder === true || item.isFolder === 'true',
    isEncrypted: item.isEncrypted === true || item.isEncrypted === 'true',
    isChunked: item.isChunked === true || item.isChunked === 'true',
    chunkCount: item.chunkCount ? Number(item.chunkCount) : 0,
    examType: item.examType || '',
    timeLimit: item.timeLimit !== undefined && item.timeLimit !== '' && item.timeLimit !== null ? Number(item.timeLimit) : undefined,
    marksCorrect: item.marksCorrect !== undefined && item.marksCorrect !== '' && item.marksCorrect !== null ? Number(item.marksCorrect) : undefined,
    marksWrong: item.marksWrong !== undefined && item.marksWrong !== '' && item.marksWrong !== null ? Number(item.marksWrong) : undefined,
    allowMultipleAttempts: item.allowMultipleAttempts === true || item.allowMultipleAttempts === 'true',
    sequence: item.sequence !== undefined && item.sequence !== '' && item.sequence !== null ? Number(item.sequence) : undefined,
    batchIds: item.batchIds || {},
    scheduledStartTime: item.scheduledStartTime || {},
    createdAt: item.createdAt || '',
    updatedAt: item.updatedAt || ''
  };
}

function getSnapshotMeta() {
  const verRow = metaGetStmt.get('version');
  const tsRow = metaGetStmt.get('timestamp');
  return {
    version: verRow ? verRow.value : null,
    timestamp: tsRow ? Number(tsRow.value) : 0
  };
}

// 1. GET /health
app.get('/health', (req, res) => {
  try {
    const versionRow = metaGetStmt.get('version');
    const tsRow = metaGetStmt.get('timestamp');
    const lastCheckedRow = metaGetStmt.get('lastCheckedAt');
    const libCount = libCountStmt.get().count;
    const usrCount = userCountStmt.get().count;
    const payCount = paymentCountStmt.get().count;

    if (!versionRow || !tsRow) {
      return res.json({
        status: 'empty',
        message: 'No snapshot synced yet',
        snapshotAgeMs: -1,
        lastCheckedAgeMs: -1
      });
    }

    const timestamp = Number(tsRow.value);
    const lastCheckedAt = lastCheckedRow ? Number(lastCheckedRow.value) : timestamp;
    const now = Date.now();

    res.json({
      status: 'ok',
      version: versionRow.value,
      timestamp: timestamp,
      lastCheckedAt: lastCheckedAt,
      snapshotAgeMs: now - timestamp,
      lastCheckedAgeMs: now - lastCheckedAt,
      libraryCount: libCount,
      usersCount: usrCount,
      paymentsCount: payCount
    });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// 1b. POST /heartbeat (HMAC protected)
app.post('/heartbeat', (req, res) => {
  try {
    if (!HMAC_SECRET) {
      return res.status(500).json({ success: false, error: 'Server HMAC secret not configured' });
    }

    const sigHeader = req.headers['x-mc-signature'] || '';
    const cleanSig = sigHeader.replace(/^sha256=/, '').trim();
    const bodyStr = req.rawBody ? req.rawBody.toString() : '';
    const expectedSig = crypto.createHmac('sha256', HMAC_SECRET).update(bodyStr).digest('hex');

    if (!cleanSig || cleanSig.length !== expectedSig.length ||
        !crypto.timingSafeEqual(Buffer.from(cleanSig), Buffer.from(expectedSig))) {
      return res.status(401).json({ success: false, error: 'Invalid HMAC signature' });
    }

    const now = Date.now();
    metaSetStmt.run('lastCheckedAt', String(now));
    res.json({ success: true, lastCheckedAt: now });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. POST /sync (HMAC protected)
app.post('/sync', (req, res) => {
  try {
    if (!HMAC_SECRET) {
      return res.status(500).json({ success: false, error: 'Server HMAC secret not configured' });
    }

    const sigHeader = req.headers['x-mc-signature'] || '';
    const cleanSig = sigHeader.replace(/^sha256=/, '').trim();

    if (!cleanSig || !req.rawBody) {
      return res.status(401).json({ success: false, error: 'Missing HMAC signature or empty body' });
    }

    const expectedSig = crypto.createHmac('sha256', HMAC_SECRET).update(req.rawBody).digest('hex');
    if (cleanSig.length !== expectedSig.length || !crypto.timingSafeEqual(Buffer.from(cleanSig), Buffer.from(expectedSig))) {
      return res.status(401).json({ success: false, error: 'Invalid HMAC signature' });
    }

    const snapshot = req.body;
    if (!snapshot || typeof snapshot !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid snapshot format' });
    }

    const timestamp = snapshot.timestamp || Date.now();
    const version = snapshot.version || new Date(timestamp).toISOString();
    const library = Array.isArray(snapshot.library) ? snapshot.library : [];
    const batches = Array.isArray(snapshot.batches) ? snapshot.batches : [];
    const hasUsersArray = Array.isArray(snapshot.users);
    const hasPaymentsArray = Array.isArray(snapshot.payments);

    const rawNotifications = Array.isArray(snapshot.notifications) ? snapshot.notifications : [];
    const notifications = rawNotifications.filter(n => {
      if (!n) return false;
      const type = String(n.type || '').trim().toLowerCase();
      const role = String(n.senderRole || '').trim().toLowerCase();
      if (type === 'student_to_admin' || role === 'student') {
        return false;
      }
      return true;
    });

    const announcement = typeof snapshot.announcement === 'string' ? snapshot.announcement : '';
    const summaryList = library.map(formatLibrarySummary);

    db.exec('BEGIN IMMEDIATE;');
    try {
      metaSetStmt.run('version', version);
      metaSetStmt.run('timestamp', String(timestamp));
      metaSetStmt.run('lastCheckedAt', String(timestamp));
      metaSetStmt.run('batches', JSON.stringify({ success: true, data: batches }));
      metaSetStmt.run('notifications', JSON.stringify({ success: true, data: notifications }));
      metaSetStmt.run('announcement', JSON.stringify({ success: true, data: announcement }));
      metaSetStmt.run('library_summary', JSON.stringify({ success: true, data: summaryList }));

      db.exec('DELETE FROM library;');
      const insertLibStmt = db.prepare('INSERT INTO library (id, item_json, summary_json) VALUES (?, ?, ?)');
      for (let i = 0; i < library.length; i++) {
        const item = library[i];
        const summary = summaryList[i];
        insertLibStmt.run(item.id, JSON.stringify(item), JSON.stringify(summary));
      }

      if (hasUsersArray) {
        db.exec('DELETE FROM users;');
        const insertUserStmt = db.prepare('INSERT INTO users (id, role, status, token_version, user_json) VALUES (?, ?, ?, ?, ?)');
        for (const rawU of snapshot.users) {
          if (!rawU || !rawU.id) continue;
          const cleanU = sanitizeUserForSnapshot(rawU);
          insertUserStmt.run(
            String(cleanU.id),
            String(cleanU.role || 'student'),
            String(cleanU.status || 'active'),
            Number(cleanU.tokenVersion || 1),
            JSON.stringify(cleanU)
          );
        }
      }

      if (hasPaymentsArray) {
        db.exec('DELETE FROM payments;');
        const insertPayStmt = db.prepare('INSERT INTO payments (id, student_id, payment_json) VALUES (?, ?, ?)');
        for (const rawP of snapshot.payments) {
          if (!rawP || !rawP.id) continue;
          const cleanP = sanitizePaymentForSnapshot(rawP);
          insertPayStmt.run(
            String(cleanP.id),
            String(cleanP.studentId || '').trim(),
            JSON.stringify(cleanP)
          );
        }
      }

      db.exec('COMMIT;');
    } catch (txErr) {
      db.exec('ROLLBACK;');
      throw txErr;
    }

    const uCount = userCountStmt.get().count;
    const pCount = paymentCountStmt.get().count;
    console.log(`[SYNC SUCCESS] version: ${version}, library: ${library.length}, users: ${uCount}, payments: ${pCount}`);
    res.json({
      success: true,
      version: version,
      timestamp: timestamp,
      records: {
        library: library.length,
        batches: batches.length,
        notifications: notifications.length,
        users: uCount,
        payments: pCount
      }
    });
  } catch (err) {
    console.error('[SYNC ERROR]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2b. POST /revoke (Lightweight HMAC-signed instant tokenVersion / status / delete revocation)
app.post('/revoke', (req, res) => {
  try {
    if (!HMAC_SECRET) {
      return res.status(500).json({ success: false, error: 'Server HMAC secret not configured' });
    }

    const sigHeader = req.headers['x-mc-signature'] || '';
    const cleanSig = sigHeader.replace(/^sha256=/, '').trim();
    if (!cleanSig || !req.rawBody) {
      return res.status(401).json({ success: false, error: 'Missing HMAC signature or empty body' });
    }

    const expectedSig = crypto.createHmac('sha256', HMAC_SECRET).update(req.rawBody).digest('hex');
    if (cleanSig.length !== expectedSig.length || !crypto.timingSafeEqual(Buffer.from(cleanSig), Buffer.from(expectedSig))) {
      return res.status(401).json({ success: false, error: 'Invalid HMAC signature' });
    }

    const { userId, tokenVersion, deleted, status } = req.body || {};
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Missing userId' });
    }

    if (deleted === true) {
      db.prepare('DELETE FROM users WHERE id = ?').run(String(userId));
      return res.json({ success: true, userId: String(userId), deleted: true });
    }

    const existing = userGetByIdStmt.get(String(userId));
    if (!existing) {
      return res.json({ success: true, userId: String(userId), updated: false, reason: 'User not in table' });
    }

    const newTv = tokenVersion !== undefined ? Number(tokenVersion) : Number(existing.token_version) + 1;
    const newStatus = status !== undefined ? String(status) : existing.status;
    let userObj = {};
    try {
      userObj = JSON.parse(existing.user_json);
    } catch (e) {}
    userObj.tokenVersion = newTv;
    if (status !== undefined) userObj.status = newStatus;

    db.prepare('UPDATE users SET token_version = ?, status = ?, user_json = ? WHERE id = ?')
      .run(newTv, newStatus, JSON.stringify(userObj), String(userId));

    return res.json({ success: true, userId: String(userId), tokenVersion: newTv, status: newStatus });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. GET /library
app.get('/library', verifyClientToken, (req, res) => {
  try {
    const row = metaGetStmt.get('library_summary');
    if (!row) return res.json({ success: true, data: [] });
    res.setHeader('Content-Type', 'application/json');
    res.send(row.value);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. GET /library/:id
app.get('/library/:id', verifyClientToken, (req, res) => {
  try {
    const row = libGetItemStmt.get(req.params.id);
    if (!row) return res.json({ success: false, error: 'Item not found' });
    res.json({ success: true, data: JSON.parse(row.item_json) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. GET /batches
app.get('/batches', verifyClientToken, (req, res) => {
  try {
    const row = metaGetStmt.get('batches');
    if (!row) return res.json({ success: true, data: [] });
    res.setHeader('Content-Type', 'application/json');
    res.send(row.value);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. GET /notifications
app.get('/notifications', verifyClientToken, (req, res) => {
  try {
    const row = metaGetStmt.get('notifications');
    if (!row) return res.json({ success: true, data: [] });
    res.setHeader('Content-Type', 'application/json');
    res.send(row.value);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. GET /announcement
app.get('/announcement', verifyClientToken, (req, res) => {
  try {
    const row = metaGetStmt.get('announcement');
    if (!row) return res.json({ success: true, data: '' });
    res.setHeader('Content-Type', 'application/json');
    res.send(row.value);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. GET /me (Stateless session verified; returns caller's own sanitized profile)
app.get('/me', verifyClientToken, verifySessionToken, (req, res) => {
  try {
    const meta = getSnapshotMeta();
    res.json({
      success: true,
      version: meta.version,
      timestamp: meta.timestamp,
      data: JSON.parse(req.session.userJson)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. GET /users (Admin ONLY)
app.get('/users', verifyClientToken, verifySessionToken, (req, res) => {
  try {
    if (req.session.role !== 'admin') {
      return res.status(403).json({
        success: false,
        code: 403,
        error: 'Forbidden: Admin access required'
      });
    }
    const meta = getSnapshotMeta();
    const rows = userGetAllStmt.all();
    const users = rows.map(r => JSON.parse(r.user_json));
    res.json({
      success: true,
      version: meta.version,
      timestamp: meta.timestamp,
      data: users
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. GET /payments (Admin: all payments; Student: strictly own payments ONLY)
app.get('/payments', verifyClientToken, verifySessionToken, (req, res) => {
  try {
    const meta = getSnapshotMeta();
    let rows;
    if (req.session.role === 'admin') {
      rows = paymentGetAllStmt.all();
    } else {
      rows = paymentGetByStudentStmt.all(String(req.session.userId));
    }
    const payments = rows.map(r => JSON.parse(r.payment_json));
    res.json({
      success: true,
      version: meta.version,
      timestamp: meta.timestamp,
      data: payments
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`mc-api server listening on port ${PORT}`);
});

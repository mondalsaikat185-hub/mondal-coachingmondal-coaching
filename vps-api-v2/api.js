'use strict';
// Line-by-line port of gas-backend/Code.gs api* functions to Node + SQLite.
// Same names, same arguments, same return shapes. Google-only features
// (Drive upload, e-mail) are relayed to Apps Script via relay.js.
const crypto = require('crypto');
const S = require('./store');
const relay = require('./relay');

const SESSION_SECRET = (process.env.MC_SESSION_SECRET || '').trim();

// ---------------- in-memory cache (replaces CacheService) ----------------
const memCache = new Map();
const cache = {
  get(k) { const e = memCache.get(k); if (!e) return null; if (Date.now() > e.exp) { memCache.delete(k); return null; } return e.v; },
  put(k, v, ttlSec) { memCache.set(k, { v: String(v), exp: Date.now() + ttlSec * 1000 }); },
  remove(k) { memCache.delete(k); },
};
setInterval(() => { const n = Date.now(); for (const [k, e] of memCache) if (n > e.exp) memCache.delete(k); }, 60000).unref();

const USERS_HEADERS = ["id", "name", "phone", "email", "role", "status", "batchId", "passcode", "address", "dob", "joinDate", "profilePhotoUrl", "monthlyFee", "pendingMonths", "exemptReason", "paymentStatus", "createdAt", "updatedAt", "excusedDates", "reapplyReason", "rejectReason", "showPaymentNudge", "salt", "tokenVersion"];
const SESSIONS_HEADERS = ["tokenHash", "userId", "role", "batchId", "name", "phone", "createdAt", "expiresAt"];

function readSheet(name) {
  if (name === 'users') S.ensureSheetHeaders('users', USERS_HEADERS.slice(0, 23));
  else if (name === 'payments') S.ensureSheetHeaders('payments', ["id", "studentId", "month", "amount", "status", "transactionId", "paidDate", "proofImage", "paymentMode", "remarks", "createdAt"]);
  return S.readSheet(name);
}
const saveRow = S.saveRow, updateRow = S.updateRow, deleteRow = S.deleteRow, deleteMultipleRows = S.deleteMultipleRows;
function markSnapshotDirty() {}

// ---------------- crypto helpers ----------------
function sha256hex(str) { return crypto.createHash('sha256').update(String(str), 'utf8').digest('hex'); }
function hashPasscode(passcode, salt) { return sha256hex(String(salt) + ":" + String(passcode).trim()); }
function generateSalt() { return crypto.randomUUID().replace(/-/g, '').substring(0, 16); }
function generateSessionToken() { return crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, ''); }
function computeTokenHash(token) { return sha256hex(String(token)); }
function computeHmacHex(message, secret) { return crypto.createHmac('sha256', String(secret)).update(String(message), 'utf8').digest('hex'); }

function cleanUserResponse(user) {
  if (!user || typeof user !== 'object') return user;
  const clone = {};
  for (const k in user) {
    if (k !== 'passcode' && k !== 'otpCode' && k !== 'otpExpiry' && k !== 'salt' && k !== 'tokenHash') clone[k] = user[k];
  }
  return clone;
}

function cleanPhone(p) {
  if (p === undefined || p === null) return "";
  let s = String(p).trim();
  if (s.toLowerCase().indexOf('e') !== -1) {
    const num = Number(p);
    if (!isNaN(num)) s = num.toFixed(0);
  }
  if (s.indexOf('.') !== -1) s = s.split('.')[0];
  const digits = s.replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

// ---------------- sessions ----------------
function createSignedSessionToken(user, expiresAtMs) {
  if (!SESSION_SECRET) return generateSessionToken();
  const payloadObj = {
    userId: String(user.id),
    role: user.role || 'student',
    batchId: String(user.batchId || ''),
    tv: Number(user.tokenVersion || 1),
    iat: Date.now(),
    exp: expiresAtMs,
    jti: crypto.randomUUID().replace(/-/g, '').substring(0, 16),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payloadObj), 'utf8').toString('base64url');
  return payloadB64 + "." + computeHmacHex(payloadB64, SESSION_SECRET);
}

function createSession(user) {
  const now = new Date();
  const expiresAtMs = now.getTime() + 30 * 24 * 60 * 60 * 1000;
  const token = createSignedSessionToken(user, expiresAtMs);
  const tokenHash = computeTokenHash(token);
  const sessionData = {
    tokenHash: tokenHash,
    userId: String(user.id),
    role: user.role || 'student',
    batchId: String(user.batchId || ''),
    name: user.name || '',
    phone: cleanPhone(user.phone),
    createdAt: now.toISOString(),
    expiresAt: new Date(expiresAtMs).toISOString(),
  };
  cache.put("sess_" + tokenHash, JSON.stringify(sessionData), 21600);
  S.ensureSheetHeaders("sessions", SESSIONS_HEADERS);
  saveRow("sessions", Object.assign({}, sessionData));
  return token;
}

function validateSessionToken(token) {
  if (!token || typeof token !== 'string') return null;
  const dotIdx = token.indexOf('.');
  if (dotIdx > 0 && dotIdx < token.length - 1 && SESSION_SECRET) {
    try {
      const payloadB64 = token.substring(0, dotIdx);
      const sigHex = token.substring(dotIdx + 1).toLowerCase();
      const expected = computeHmacHex(payloadB64, SESSION_SECRET).toLowerCase();
      if (sigHex.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sigHex), Buffer.from(expected))) return null;
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
      if (!payload || !payload.exp || Date.now() >= Number(payload.exp)) return null;
    } catch (e) { return null; }
  }
  const tokenHash = computeTokenHash(token);
  const cached = cache.get("sess_" + tokenHash);
  if (cached) {
    try {
      const sess = JSON.parse(cached);
      if (new Date(sess.expiresAt).getTime() > Date.now()) return sess;
    } catch (e) {}
  }
  const found = S.readSheet("sessions").find(s => s.tokenHash === tokenHash);
  if (!found) return null;
  if (new Date(found.expiresAt).getTime() <= Date.now()) return null;
  cache.put("sess_" + tokenHash, JSON.stringify(found), 21600);
  return found;
}

function revokeUserSessions(userId) {
  const past = new Date(0).toISOString();
  S.mapRows("sessions", (o) => {
    if (String(o.userId).trim() === String(userId).trim()) {
      if (o.tokenHash) cache.remove("sess_" + o.tokenHash);
      o.expiresAt = past;
      return o;
    }
    return null;
  });
}

function bumpUserTokenVersionAndNotifyVps(userId, opts) {
  opts = opts || {};
  revokeUserSessions(userId);
  S.ensureSheetHeaders("users", USERS_HEADERS);
  let newTv = 2;
  if (!opts.deleted) {
    const u = readSheet("users").find(x => String(x.id).trim() === String(userId).trim());
    const curTv = (u && u.tokenVersion) ? Number(u.tokenVersion) : 1;
    newTv = curTv + 1;
    updateRow("users", userId, { tokenVersion: newTv });
  }
  return newTv;
}

// Daily cleanup of expired session rows (keeps table small)
function purgeExpiredSessions() {
  const cutoff = Date.now() - 24 * 3600 * 1000;
  return S.deleteWhere("sessions", s => { const t = new Date(s.expiresAt).getTime(); return !isNaN(t) && t < cutoff; });
}

// =========================================================================
// USERS / AUTH
// =========================================================================
function apiLogoutUser(session) {
  try {
    if (session && session.userId) revokeUserSessions(session.userId);
    return { success: true };
  } catch (e) { return { success: false, error: String(e) }; }
}

function apiGetUsers() {
  try {
    return { success: true, data: readSheet("users").map(u => cleanUserResponse(u)) };
  } catch (err) { return { success: false, error: String(err) }; }
}

function apiHealStudentIds() {
  try {
    const users = readSheet("users");
    const usedIds = {}; const idMap = {};
    let healedCount = 0, updatedRows = 0;
    // users rows are rewritten in order
    let idx = 0;
    S.mapRows("users", (o) => {
      const oldId = String(o.id === undefined ? '' : o.id).trim();
      idx++;
      let needs = false;
      if (!oldId || oldId === "undefined" || oldId === "null") needs = true;
      else if (usedIds[oldId]) needs = true;
      if (needs) {
        const newId = S.uuid();
        if (oldId && oldId !== "undefined" && oldId !== "null") idMap[oldId] = newId;
        o.id = newId; usedIds[newId] = true; healedCount++;
        return o;
      }
      usedIds[oldId] = true;
      return null;
    });
    void users;
    if (Object.keys(idMap).length > 0) {
      for (const sName of ["payments", "attendance", "examResults"]) {
        updatedRows += S.mapRows(sName, (o) => {
          const cur = String(o.studentId === undefined ? '' : o.studentId).trim();
          if (idMap[cur]) { o.studentId = idMap[cur]; return o; }
          return null;
        });
      }
      updatedRows += S.mapRows("examSessions", (o) => {
        let uids = [];
        try { uids = JSON.parse(o.participantUids || "[]"); } catch (e) { return null; }
        if (!Array.isArray(uids)) return null;
        let changed = false;
        for (let i = 0; i < uids.length; i++) if (idMap[uids[i]]) { uids[i] = idMap[uids[i]]; changed = true; }
        if (changed) { o.participantUids = JSON.stringify(uids); return o; }
        return null;
      });
    }
    return { success: true, healedCount, updatedRows, idMap };
  } catch (err) { return { success: false, error: String(err) }; }
}

function apiSaveUser(userData, session) {
  try {
    if (!userData) return { success: false, error: "No user data provided" };
    const users = readSheet("users");
    let existingUser = null;
    if (userData.id) existingUser = users.find(u => String(u.id) === String(userData.id));
    if (!existingUser && userData.phone) existingUser = users.find(u => cleanPhone(u.phone) === cleanPhone(userData.phone));

    if (session && session.role !== 'admin') {
      if (existingUser && String(existingUser.id) !== String(session.userId)) return { success: false, error: "Forbidden: Cannot edit other users' profile", code: 403 };
      if (userData.id && String(userData.id) !== String(session.userId)) return { success: false, error: "Forbidden: Cannot edit other users' profile", code: 403 };
      const allowed = ["name", "address", "dob", "profilePhotoUrl"];
      const filtered = {};
      for (const key of allowed) if (userData[key] !== undefined) filtered[key] = userData[key];
      userData = filtered;
      if (existingUser) userData.id = existingUser.id;
    }

    if (existingUser) {
      const safe = {};
      for (const key in userData) {
        if (key !== 'id') {
          if (key === 'passcode' && (!userData[key] || String(userData[key]).trim() === '')) continue;
          safe[key] = userData[key];
        }
      }
      // Admin setting a new passcode through edit form: store it hashed (GAS stored whatever was sent)
      if (safe.passcode !== undefined) {
        const salt = generateSalt();
        safe.salt = salt;
        safe.passcode = hashPasscode(String(safe.passcode).trim(), salt);
      }
      const updated = updateRow("users", existingUser.id, safe);
      const ret = updated ? updated : {};
      ret.id = existingUser.id;
      return { success: true, data: cleanUserResponse(ret) };
    } else {
      userData.role = userData.role || "student";
      userData.status = userData.status || "incomplete";
      userData.paymentStatus = userData.paymentStatus || "unpaid";
      userData.monthlyFee = userData.monthlyFee !== undefined && userData.monthlyFee !== '' && userData.monthlyFee !== null ? Number(userData.monthlyFee) : 500;
      userData.tokenVersion = 1;
      const raw = userData.passcode ? String(userData.passcode).trim() : cleanPhone(userData.phone);
      const salt = generateSalt();
      userData.salt = salt;
      userData.passcode = hashPasscode(raw, salt);
      const saved = saveRow("users", userData);
      return { success: true, data: cleanUserResponse(saved) };
    }
  } catch (err) { return { success: false, error: String(err) }; }
}

function apiRegisterUser(userData) {
  try {
    if (!userData || !userData.phone) return { success: false, error: "ফোন নম্বর দেওয়া হয়নি।" };
    if (!userData.name) return { success: false, error: "নাম দেওয়া হয়নি।" };
    if (!userData.batchId) return { success: false, error: "ব্যাচ নির্বাচন করা হয়নি।" };
    const users = readSheet("users");
    const cleanedPhone = cleanPhone(userData.phone);
    const existingUser = users.find(u => cleanPhone(u.phone) === cleanedPhone);
    if (existingUser) {
      const st = String(existingUser.status || "pending").toLowerCase().trim();
      return { success: true, status: st, message: "User already exists" };
    }
    const salt = generateSalt();
    userData.salt = salt;
    userData.role = "student";
    userData.status = "pending";
    userData.paymentStatus = "unpaid";
    userData.monthlyFee = 500;
    userData.tokenVersion = 1;
    userData.passcode = hashPasscode(cleanedPhone, salt);
    userData.createdAt = S.nowIso();
    S.ensureSheetHeaders("users", USERS_HEADERS);
    const saved = saveRow("users", userData);
    return { success: true, data: cleanUserResponse(saved) };
  } catch (err) { return { success: false, error: String(err) }; }
}

function removeUserFromExamSessions(userId) {
  S.mapRows("examSessions", (o) => {
    let uids = [];
    try { uids = JSON.parse(o.participantUids || "[]"); } catch (e) { return null; }
    if (!Array.isArray(uids)) return null;
    const before = uids.length;
    uids = uids.filter(uid => String(uid) !== String(userId));
    if (uids.length !== before) { o.participantUids = JSON.stringify(uids); return o; }
    return null;
  });
}

function apiDeleteUser(userId) {
  try {
    deleteMultipleRows("payments", "studentId", userId);
    deleteMultipleRows("attendance", "studentId", userId);
    deleteMultipleRows("examResults", "studentId", userId);
    removeUserFromExamSessions(userId);
    const success = deleteRow("users", userId);
    bumpUserTokenVersionAndNotifyVps(userId, { deleted: true });
    return { success };
  } catch (err) { return { success: false, error: String(err) }; }
}

function apiUpdateUserStatus(userId, status, rejectReason) {
  try {
    const updates = { status: status, updatedAt: S.nowIso() };
    if (status === 'active') updates.paymentStatus = 'unpaid';
    if (rejectReason) { updates.reapplyReason = rejectReason; updates.rejectReason = rejectReason; }
    const updated = updateRow("users", userId, updates);
    bumpUserTokenVersionAndNotifyVps(userId, { status });
    return { success: true, data: updated };
  } catch (err) { return { success: false, error: String(err) }; }
}

function apiUpdateUserPasscode(userId, passcode) {
  try {
    const salt = generateSalt();
    const updated = updateRow("users", userId, { passcode: hashPasscode(String(passcode || "").trim(), salt), salt });
    bumpUserTokenVersionAndNotifyVps(userId);
    return { success: true, data: cleanUserResponse(updated) };
  } catch (err) { return { success: false, error: String(err) }; }
}

function passcodeMatches(user, input) {
  if (user.salt && String(user.salt).trim() !== "") {
    return hashPasscode(input, user.salt) === String(user.passcode).trim();
  }
  let stored = user.passcode !== undefined && user.passcode !== null ? String(user.passcode).trim() : "";
  if (stored === "") stored = cleanPhone(user.phone);
  if (stored === input) return true;
  const a = cleanPhone(stored), b = cleanPhone(input);
  return Boolean(a && a === b);
}

function apiChangePasscode(userId, currentPasscode, newPasscode, session) {
  try {
    if (session && session.role !== 'admin') userId = session.userId;
    const user = readSheet("users").find(u => String(u.id) === String(userId));
    if (!user) return { success: false, error: "ব্যবহারকারী পাওয়া যায়নি।" };
    if (!passcodeMatches(user, String(currentPasscode || "").trim())) return { success: false, error: "বর্তমান passcode ভুল।" };
    if (String(newPasscode).trim().length < 4) return { success: false, error: "নতুন passcode কমপক্ষে ৪ অক্ষরের হতে হবে।" };
    const salt = generateSalt();
    updateRow("users", userId, { passcode: hashPasscode(String(newPasscode).trim(), salt), salt });
    bumpUserTokenVersionAndNotifyVps(userId);
    return { success: true };
  } catch (err) { return { success: false, error: String(err) }; }
}

function apiAdminResetPasscode(studentId, newPasscode) {
  try {
    if (String(newPasscode).trim().length < 4) return { success: false, error: "নতুন passcode কমপক্ষে ৪ অক্ষরের হতে হবে।" };
    const salt = generateSalt();
    const updated = updateRow("users", studentId, { passcode: hashPasscode(String(newPasscode).trim(), salt), salt });
    if (!updated) return { success: false, error: "ব্যবহারকারী পাওয়া যায়নি।" };
    bumpUserTokenVersionAndNotifyVps(studentId);
    return { success: true };
  } catch (err) { return { success: false, error: String(err) }; }
}

// OTP: generated and verified here; the e-mail itself is sent by Apps Script (relay)
async function apiSendOTP(phone) {
  try {
    if (!phone) return { success: false, error: "ফোন নম্বর দেওয়া হয়নি।" };
    const cleanedPhone = cleanPhone(phone);
    const user = readSheet("users").find(u => cleanPhone(u.phone) === cleanedPhone);
    if (!user) return { success: false, error: "এই ফোন নম্বরটি নিবন্ধিত নয়।" };
    if (!user.email) return { success: false, error: "এই অ্যাকাউন্টে কোনো email নেই। Admin-এর সাথে যোগাযোগ করুন।" };
    const rlKey = "otp_rl_" + cleanedPhone;
    const count = Number(cache.get(rlKey) || 0);
    if (count >= 3) return { success: false, error: "খুব বেশি চেষ্টা করেছেন। ১৫ মিনিট পর পুনরায় চেষ্টা করুন। (Too many attempts. Please try again after 15 minutes.)" };
    cache.put(rlKey, String(count + 1), 900);
    const otp = String(crypto.randomInt(100000, 1000000));
    const expiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    S.setProp("otp_" + cleanedPhone, JSON.stringify({ otpHash: computeTokenHash(otp), expiry, tries: 0 }));
    const body = "প্রিয় " + (user.name || "Student") + ",\n\n" +
      "আপনার passcode reset OTP: " + otp + "\n\n" +
      "এই কোডটি ১০ মিনিটের জন্য বৈধ (সর্বোচ্চ ৩ বার চেষ্টা করা যাবে)।\n" +
      "- M-C Tuition Application";
    const sent = await relay.sendMail(user.email, "M-C Tuition: Passcode Reset OTP", body);
    if (!sent.success) return { success: false, error: "OTP পাঠানো যায়নি। Admin-এর সাথে যোগাযোগ করুন। (" + (sent.error || '') + ")" };
    const parts = String(user.email).split("@");
    const masked = parts[0].substring(0, Math.min(2, parts[0].length)) + "***@" + parts[1];
    return { success: true, maskedEmail: masked };
  } catch (err) { return { success: false, error: String(err) }; }
}

function apiVerifyOTPAndReset(phone, otp, newPasscode) {
  try {
    if (!phone || !otp || !newPasscode) return { success: false, error: "সমস্ত তথ্য দেওয়া হয়নি।" };
    const cleanedPhone = cleanPhone(phone);
    const key = "otp_" + cleanedPhone;
    const stored = S.getProp(key);
    if (!stored) return { success: false, error: "OTP পাওয়া যায়নি। আবার OTP পাঠান।" };
    const data = JSON.parse(stored);
    data.tries = (data.tries || 0) + 1;
    if (data.tries > 3) { S.delProp(key); return { success: false, error: "সর্বোচ্চ ৩ বার ভুল কোড দেওয়া হয়েছে। নতুন OTP পাঠান।" }; }
    S.setProp(key, JSON.stringify(data));
    if (new Date() > new Date(data.expiry)) { S.delProp(key); return { success: false, error: "OTP-এর মেয়াদ শেষ হয়েছে। আবার OTP পাঠান।" }; }
    if (data.otpHash !== computeTokenHash(String(otp).trim())) return { success: false, error: "ভুল OTP! আর " + (3 - data.tries) + " বার চেষ্টা করতে পারবেন।" };
    if (String(newPasscode).trim().length < 4) return { success: false, error: "নতুন passcode কমপক্ষে ৪ অক্ষরের হতে হবে।" };
    const user = readSheet("users").find(u => cleanPhone(u.phone) === cleanedPhone);
    if (!user) return { success: false, error: "ব্যবহারকারী পাওয়া যায়নি।" };
    const salt = generateSalt();
    updateRow("users", user.id, { passcode: hashPasscode(String(newPasscode).trim(), salt), salt });
    bumpUserTokenVersionAndNotifyVps(user.id);
    S.delProp(key);
    return { success: true };
  } catch (err) { return { success: false, error: String(err) }; }
}

function apiCheckApplicationStatus(phone) {
  try {
    if (!phone) return { success: false, error: "ফোন নম্বর দেওয়া হয়নি।" };
    const cleanedPhone = cleanPhone(phone);
    const user = readSheet("users").find(u => cleanPhone(u.phone) === cleanedPhone);
    if (!user) return { success: true, status: "not_found" };
    return { success: true, status: String(user.status || "pending").toLowerCase().trim(), userId: user.id, name: user.name || "" };
  } catch (err) { return { success: false, error: String(err) }; }
}

function apiLoginUser(phone, passcode) {
  try {
    const cleanedPhone = cleanPhone(phone);
    const lockKey = "login_lock_" + cleanedPhone, failKey = "login_fail_" + cleanedPhone;
    const isLocked = cache.get(lockKey);
    if (isLocked) {
      const remainingMin = Math.ceil((Number(isLocked) - Date.now()) / 60000);
      return { success: false, error: "অ্যাকাউন্ট সাময়িকভাবে লক করা হয়েছে। " + (remainingMin > 0 ? remainingMin : 15) + " মিনিট পর পুনরায় চেষ্টা করুন। (Account locked due to 5 failed attempts)", code: 429 };
    }
    const user = readSheet("users").find(u => cleanPhone(u.phone) === cleanedPhone);
    if (!user) return { success: false, error: "ফোন নম্বরটি নিবন্ধিত নয় (Phone number not registered)" };
    const input = passcode !== undefined && passcode !== null ? String(passcode).trim() : "";
    const hadSalt = Boolean(user.salt && String(user.salt).trim() !== "");
    if (!passcodeMatches(user, input)) {
      const failCount = Number(cache.get(failKey) || 0) + 1;
      if (failCount >= 5) {
        cache.remove(failKey);
        cache.put(lockKey, String(Date.now() + 15 * 60 * 1000), 900);
        return { success: false, error: "ভুল পাসকোড! ৫ বার ভুল করার কারণে অ্যাকাউন্ট ১৫ মিনিটের জন্য লক করা হয়েছে। (Account locked for 15 minutes)", code: 429 };
      }
      cache.put(failKey, String(failCount), 900);
      return { success: false, error: "ভুল পাসকোড! আর " + (5 - failCount) + " বার চেষ্টা করতে পারবেন। (Invalid passcode)", remainingAttempts: 5 - failCount };
    }
    cache.remove(failKey); cache.remove(lockKey);
    if (!hadSalt && input) {
      const salt = generateSalt();
      const hash = hashPasscode(input, salt);
      updateRow("users", user.id, { passcode: hash, salt });
      user.passcode = hash; user.salt = salt;
    }
    const sessionToken = createSession(user);
    const safeUser = cleanUserResponse(user);
    safeUser.sessionToken = sessionToken;
    return { success: true, data: safeUser };
  } catch (err) { return { success: false, error: String(err) }; }
}

function apiGetMyProfile(session) {
  try {
    if (!session || !session.userId) return { success: false, error: "Unauthorized access: Valid session required", code: 401 };
    const user = readSheet("users").find(u => String(u.id) === String(session.userId));
    if (!user) return { success: false, error: "User not found", code: 404 };
    return { success: true, data: cleanUserResponse(user) };
  } catch (err) { return { success: false, error: String(err) }; }
}

// =========================================================================
// BATCHES
// =========================================================================
const BATCH_HEADERS = ["id", "name", "assignedItemsMap", "scheduledStartTimeMap", "createdAt"];
function parseMap(v) { if (!v) return {}; if (typeof v === 'object') return v; try { return JSON.parse(v) || {}; } catch (e) { return {}; } }

function apiGetBatches() {
  try {
    S.ensureSheetHeaders("batches", BATCH_HEADERS);
    const list = readSheet("batches");
    list.forEach(item => {
      item.assignedItemsMap = parseMap(item.assignedItemsMap);
      item.scheduledStartTimeMap = parseMap(item.scheduledStartTimeMap);
    });
    return { success: true, data: list };
  } catch (err) { return { success: false, error: String(err) }; }
}

function apiSaveBatch(batchData) {
  try {
    if (batchData.id) {
      const id = batchData.id; delete batchData.id;
      return { success: true, data: updateRow("batches", id, batchData) };
    }
    return { success: true, data: saveRow("batches", batchData) };
  } catch (err) { return { success: false, error: String(err) }; }
}

function apiDeleteBatch(batchId) {
  try {
    const users = readSheet("users");
    users.forEach(u => {
      if (u.batchId) {
        const ids = String(u.batchId).split(',').map(x => x.trim()).filter(Boolean);
        const index = ids.indexOf(String(batchId));
        if (index !== -1) {
          if (ids.length === 1) {
            deleteMultipleRows("payments", "studentId", u.id);
            deleteMultipleRows("attendance", "studentId", u.id);
            deleteMultipleRows("examResults", "studentId", u.id);
            removeUserFromExamSessions(u.id);
            deleteRow("users", u.id);
          } else {
            ids.splice(index, 1);
            updateRow("users", u.id, { batchId: ids.join(', ') });
          }
        }
      }
    });
    deleteMultipleRows("examSessions", "batchId", batchId);
    return { success: deleteRow("batches", batchId) };
  } catch (err) { return { success: false, error: String(err) }; }
}

// =========================================================================
// LIBRARY
// =========================================================================
function libSummary(item) {
  return {
    id: item.id || "",
    title: item.title || "",
    type: item.type || "folder",
    parentId: item.parentId || null,
    isFolder: item.isFolder === true || item.isFolder === "true",
    isEncrypted: item.isEncrypted === true || item.isEncrypted === "true",
    isChunked: item.isChunked === true || item.isChunked === "true",
    chunkCount: item.chunkCount ? Number(item.chunkCount) : 0,
    examType: item.examType || "",
    timeLimit: item.timeLimit !== undefined && item.timeLimit !== "" ? Number(item.timeLimit) : undefined,
    marksCorrect: item.marksCorrect !== undefined && item.marksCorrect !== "" ? Number(item.marksCorrect) : undefined,
    marksWrong: item.marksWrong !== undefined && item.marksWrong !== "" ? Number(item.marksWrong) : undefined,
    allowMultipleAttempts: item.allowMultipleAttempts === true || item.allowMultipleAttempts === "true",
    sequence: item.sequence !== undefined && item.sequence !== "" ? Number(item.sequence) : undefined,
    trackingId: item.trackingId || "",
    contentUrl: item.contentUrl || "",
    fileName: item.fileName || "",
    createdAt: item.createdAt || "",
    updatedAt: item.updatedAt || "",
    isActive: item.isActive !== false && item.isActive !== "false",
  };
}

function apiGetLibrary() {
  try { return { success: true, data: readSheet("library").map(libSummary) }; }
  catch (err) { return { success: false, error: String(err) }; }
}

function apiGetLibraryItemDetails(itemId) {
  try {
    const found = S.findRowById("library", itemId);
    if (!found) return { success: false, error: "Item not found" };
    const item = Object.assign({}, found.obj);
    for (const h of S.getHeaders("library")) if (item[h] === undefined) item[h] = "";
    item.isFolder = item.isFolder === true || item.isFolder === "true";
    item.isEncrypted = item.isEncrypted === true || item.isEncrypted === "true";
    item.isChunked = item.isChunked === true || item.isChunked === "true";
    if (item.chunkCount) item.chunkCount = Number(item.chunkCount);
    return { success: true, data: item };
  } catch (err) { return { success: false, error: String(err) }; }
}

function apiSaveLibraryItem(itemData) {
  try {
    if (itemData.id) {
      const id = itemData.id; delete itemData.id;
      return { success: true, data: updateRow("library", id, itemData) };
    }
    return { success: true, data: saveRow("library", itemData) };
  } catch (err) { return { success: false, error: String(err) }; }
}

function apiUpdateLibrarySequences(updates) {
  try {
    if (!Array.isArray(updates) || updates.length === 0) return { success: true };
    updates.forEach(it => { if (it.id && typeof it.sequence !== 'undefined') updateRow("library", it.id, { sequence: it.sequence }); });
    return { success: true };
  } catch (err) { return { success: false, error: String(err) }; }
}

function removeItemsFromBatches(itemIds) {
  const set = new Set(itemIds.map(String));
  S.ensureSheetHeaders("batches", BATCH_HEADERS);
  S.mapRows("batches", (b) => {
    const assigned = parseMap(b.assignedItemsMap), scheduled = parseMap(b.scheduledStartTimeMap);
    let changed = false;
    for (const id of set) {
      if (assigned[id]) { delete assigned[id]; changed = true; }
      if (scheduled[id]) { delete scheduled[id]; changed = true; }
    }
    if (!changed) return null;
    b.assignedItemsMap = JSON.stringify(assigned);
    b.scheduledStartTimeMap = JSON.stringify(scheduled);
    b.updatedAt = S.nowIso();
    return b;
  });
}

function apiDeleteLibraryItem(itemId) {
  try {
    const success = deleteRow("library", itemId);
    removeItemsFromBatches([itemId]);
    deleteMultipleRows("examSessions", "examId", itemId);
    deleteMultipleRows("examResults", "examId", itemId);
    return { success };
  } catch (err) { return { success: false, error: String(err) }; }
}

function apiDeleteMultipleLibraryItems(itemIds) {
  try {
    if (!Array.isArray(itemIds) || itemIds.length === 0) return { success: true, count: 0 };
    const set = new Set(itemIds.map(String));
    const count = S.deleteWhere("library", o => set.has(String(o.id)));
    removeItemsFromBatches(itemIds);
    for (const id of itemIds) {
      deleteMultipleRows("examSessions", "examId", id);
      deleteMultipleRows("examResults", "examId", id);
    }
    return { success: true, count };
  } catch (err) { return { success: false, error: String(err) }; }
}

function apiShareLibraryItem(itemId, batchIdsMap, scheduledStartTimeMap) {
  try {
    S.ensureSheetHeaders("batches", BATCH_HEADERS);
    scheduledStartTimeMap = scheduledStartTimeMap || {};
    batchIdsMap = batchIdsMap || {};
    S.mapRows("batches", (b) => {
      const bId = String(b.id);
      if (!Object.prototype.hasOwnProperty.call(batchIdsMap, bId)) return null;
      const assigned = parseMap(b.assignedItemsMap), scheduled = parseMap(b.scheduledStartTimeMap);
      const oa = JSON.stringify(assigned), os = JSON.stringify(scheduled);
      if (batchIdsMap[bId] === true) {
        if (!assigned[itemId]) assigned[itemId] = S.nowIso();
        if (scheduledStartTimeMap[bId]) scheduled[itemId] = scheduledStartTimeMap[bId];
        else delete scheduled[itemId];
      } else {
        delete assigned[itemId]; delete scheduled[itemId];
      }
      const na = JSON.stringify(assigned), ns = JSON.stringify(scheduled);
      if (oa === na && os === ns) return null;
      b.assignedItemsMap = na; b.scheduledStartTimeMap = ns;
      return b;
    });
    return { success: true };
  } catch (err) { return { success: false, error: String(err) }; }
}

// =========================================================================
// PAYMENTS
// =========================================================================
function apiGetPayments(session) {
  try {
    let all = readSheet("payments");
    if (session && session.role !== 'admin') all = all.filter(p => String(p.studentId).trim() === String(session.userId).trim());
    return { success: true, data: all.map(p => { const c = Object.assign({}, p); c.hasProof = Boolean(p.proofImage && String(p.proofImage).trim() !== ""); c.proofImage = ""; return c; }) }; // proof is fetched separately via apiGetPaymentProof
  } catch (err) { return { success: false, error: String(err) }; }
}

function apiGetPaymentProof(paymentId, session) {
  try {
    if (!session || !session.userId) return { success: false, error: "Unauthorized access: Valid session required", code: 401 };
    const found = S.findRowById("payments", paymentId);
    if (!found) return { success: false, error: "Payment record not found", code: 404 };
    const payment = found.obj;
    if (session.role !== 'admin' && String(payment.studentId).trim() !== String(session.userId).trim()) return { success: false, error: "Forbidden: Not authorized to view this payment proof", code: 403 };
    return { success: true, data: { id: payment.id, proofImage: payment.proofImage ? String(payment.proofImage) : "" } };
  } catch (err) { return { success: false, error: String(err) }; }
}

function apiDeletePayment(paymentId, session) {
  try {
    if (!session || session.role !== 'admin') return { success: false, error: "Forbidden: Admin access required", code: 403 };
    return { success: deleteRow("payments", paymentId) };
  } catch (err) { return { success: false, error: String(err) }; }
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
function parseYearMonth(str) {
  if (!str) return null;
  const s = String(str).toLowerCase().trim();
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return { y: parseInt(m[3], 10), m: parseInt(m[1], 10) };
  m = s.match(/^([a-z]+)[\s\-_]?(\d{4})$/);
  if (m) { const idx = MONTHS.indexOf(m[1]); if (idx !== -1) return { y: parseInt(m[2], 10), m: idx + 1 }; }
  m = s.match(/^(\d{4})[-/](\d{1,2})/);
  if (m) return { y: parseInt(m[1], 10), m: parseInt(m[2], 10) };
  return null;
}

function apiSubmitPaymentRequest(paymentData, session) {
  try {
    if (!session || !session.userId) return { success: false, error: "Unauthorized access: Valid session required", code: 401 };
    if (!paymentData) return { success: false, error: "No payment data provided" };
    const monthStr = String(paymentData.month || "").trim();
    if (!monthStr) return { success: false, error: "Month selection is required" };
    const amountNum = Number(paymentData.amount) || 0;
    if (amountNum <= 0) return { success: false, error: "Valid amount is required" };
    let paidVia = String(paymentData.paymentMode || paymentData.paidVia || "upi").toLowerCase().trim();
    if (paidVia !== "cash" && paidVia !== "upi") paidVia = "upi";
    const txnId = String(paymentData.transactionId || "").trim();
    const allPayments = readSheet("payments");
    if (paidVia === "upi") {
      if (!/^\d{12}$/.test(txnId)) return { success: false, error: "সঠিক ১২ সংখ্যার UTR নম্বর আবশ্যক (12-digit numeric UTR required)" };
      if (allPayments.find(p => p.transactionId && String(p.transactionId).trim() === txnId)) return { success: false, error: "এই UTR নম্বরটি ইতিমধ্যে ব্যবহৃত হয়েছে (Duplicate UTR)" };
    }
    const reqMonths = monthStr.split(/[,;\n]+/).map(m => m.trim()).filter(Boolean);
    const covered = {};
    allPayments.forEach(p => {
      if (String(p.studentId) === String(session.userId) && (p.status === 'approved' || p.status === 'pending' || p.status === 'paid') && p.month) {
        String(p.month).split(/[,;\n]+/).forEach(m => { const ym = parseYearMonth(m.trim()); if (ym) covered[ym.y + "-" + ym.m] = true; });
      }
    });
    const stu = readSheet("users").find(u => String(u.id) === String(session.userId));
    if (stu && (stu.excusedMonths || stu.excusedDates)) {
      String(stu.excusedMonths || stu.excusedDates || "").split(/[,;\n]+/).forEach(m => { const ym = parseYearMonth(m.trim()); if (ym) covered[ym.y + "-" + ym.m] = true; });
    }
    reqMonths.forEach(m => { const ym = parseYearMonth(m); if (ym) covered[ym.y + "-" + ym.m] = true; });
    const START_Y = 2026, START_M = 10;
    for (const rm of reqMonths) {
      const t = parseYearMonth(rm);
      if (!t) continue;
      const tt = t.y * 12 + t.m;
      if (tt < START_Y * 12 + START_M) continue;
      let cy = START_Y, cm = START_M;
      while (cy * 12 + cm < tt) {
        if (!covered[cy + "-" + cm]) {
          const title = MONTHS[cm - 1].charAt(0).toUpperCase() + MONTHS[cm - 1].slice(1) + " " + cy;
          return { success: false, error: "আগে বাকি মাস (" + title + ") পরিশোধ করুন" };
        }
        cm++; if (cm > 12) { cm = 1; cy++; }
      }
    }
    const np = {
      id: "pay_" + S.uuid().substring(0, 8),
      studentId: String(session.userId),
      studentName: session.name || "Student",
      month: monthStr,
      amount: amountNum,
      status: "pending",
      paidVia, paymentMode: paidVia,
      transactionId: txnId,
      proofImage: paymentData.proofImage || "",
      remarks: paymentData.remarks || "",
      paidDate: S.nowIso(),
      createdAt: S.nowIso(),
    };
    S.ensureSheetHeaders("payments", ["id", "studentId", "studentName", "month", "amount", "status", "paidVia", "paymentMode", "transactionId", "proofImage", "remarks", "paidDate", "createdAt"]);
    const saved = saveRow("payments", np);
    saved.hasProof = Boolean(np.proofImage && String(np.proofImage).trim() !== "");
    return { success: true, data: saved };
  } catch (err) { return { success: false, error: String(err) }; }
}

function apiBulkUpdatePaymentStatus(paymentIds, status, remarks, session) {
  try {
    if (!session || session.role !== 'admin') return { success: false, error: "Forbidden: Admin access required", code: 403 };
    if (!Array.isArray(paymentIds) || paymentIds.length === 0) return { success: false, error: "No payment IDs provided" };
    let target = String(status || 'approved').toLowerCase().trim();
    if (target === 'paid') target = 'approved';
    let n = 0;
    paymentIds.forEach(pid => {
      const f = S.findRowById("payments", pid);
      if (f) {
        const u = { status: target };
        if (remarks) u.remarks = String(remarks).trim();
        updateRow("payments", pid, u);
        if (f.obj.studentId && target === 'approved') updateRow("users", f.obj.studentId, { paymentStatus: 'paid' });
        n++;
      }
    });
    return { success: true, count: n };
  } catch (err) { return { success: false, error: String(err) }; }
}

function apiSetStudentExcusedMonths(studentId, excusedMonths, session) {
  try {
    if (!session || session.role !== 'admin') return { success: false, error: "Forbidden: Admin access required", code: 403 };
    S.ensureSheetHeaders("users", USERS_HEADERS.concat(["excusedMonths"]));
    updateRow("users", studentId, { excusedMonths: String(excusedMonths || "").trim() });
    return { success: true };
  } catch (err) { return { success: false, error: String(err) }; }
}

function apiUpdatePaymentStatus(paymentId, status, remarks, session) {
  try {
    if (!session || session.role !== 'admin') return { success: false, error: "Forbidden: Admin access required", code: 403 };
    let target = String(status || '').toLowerCase().trim();
    if (target !== 'approved' && target !== 'rejected' && target !== 'paid') return { success: false, error: "Invalid status: only 'approved' or 'rejected' allowed" };
    if (target === 'paid') target = 'approved';
    if (target === 'rejected' && !String(remarks || '').trim()) return { success: false, error: "Rejection reason (remarks) is mandatory when rejecting a payment." };
    const f = S.findRowById("payments", paymentId);
    if (!f) return { success: false, error: "Payment record not found" };
    const u = { status: target };
    if (remarks !== undefined && remarks !== null) u.remarks = String(remarks).trim();
    const updated = updateRow("payments", paymentId, u);
    if (f.obj.studentId && target === 'approved') updateRow("users", f.obj.studentId, { paymentStatus: 'paid' });
    return { success: true, data: updated };
  } catch (err) { return { success: false, error: String(err) }; }
}

// =========================================================================
// NOTIFICATIONS
// =========================================================================
function apiGetNotifications(session) {
  try {
    let all = readSheet("notifications");
    if (session && session.role !== 'admin') {
      const sid = String(session.userId || '').trim();
      const sb = String(session.batchId || '').trim();
      all = all.filter(n => {
        if (!n) return false;
        const type = String(n.type || '').trim().toLowerCase();
        const target = String(n.target || n.batchId || '').trim().toLowerCase();
        const tsid = String(n.studentId || n.recipientId || '').trim();
        if (target === 'all' || type === 'broadcast') return true;
        if (tsid && tsid === sid) return true;
        if (sb && target === sb) return true;
        if (String(n.senderId || n.studentId || '').trim() === sid) return true;
        return false;
      });
    }
    return { success: true, data: all };
  } catch (err) { return { success: false, error: String(err) }; }
}

function apiCreateNotification(notifData, session) {
  try {
    notifData = notifData || {};
    if (session && session.role !== 'admin') {
      notifData.senderRole = 'student';
      notifData.senderId = session.userId;
      notifData.type = 'student_to_admin';
    }
    return { success: true, data: saveRow("notifications", notifData) };
  } catch (err) { return { success: false, error: String(err) }; }
}

function apiDeleteNotification(notifId, session) {
  try {
    if (!session || !session.userId) return { success: false, error: "Unauthorized access: Valid session required", code: 401 };
    if (session.role !== 'admin') {
      const f = S.findRowById("notifications", notifId);
      if (!f || String(f.obj.senderId) !== String(session.userId)) return { success: false, error: "Forbidden: you can delete only your own notification", code: 403 };
    }
    return { success: deleteRow("notifications", notifId) };
  } catch (err) { return { success: false, error: String(err) }; }
}

// =========================================================================
// EXAMS
// =========================================================================
function apiGetExamSessions() {
  try {
    const list = readSheet("examSessions");
    list.forEach(item => {
      item.isActive = item.isActive === true || item.isActive === "true";
      item.codeEnabled = item.codeEnabled === true || item.codeEnabled === "true";
      try { item.participantUids = JSON.parse(item.participantUids || "[]"); } catch (e) { item.participantUids = []; }
      if (!Array.isArray(item.participantUids)) item.participantUids = [];
    });
    return { success: true, data: list };
  } catch (err) { return { success: false, error: String(err) }; }
}

function apiCreateExamSession(sessionData) {
  try {
    sessionData = sessionData || {};
    sessionData.isActive = true;
    sessionData.participantUids = sessionData.participantUids || [];
    return { success: true, data: saveRow("examSessions", sessionData) };
  } catch (err) { return { success: false, error: String(err) }; }
}

function apiEndExamSession(sessionId) {
  try { return { success: true, data: updateRow("examSessions", sessionId, { isActive: false }) }; }
  catch (err) { return { success: false, error: String(err) }; }
}

function apiJoinExamSession(sessionId, userId, studentName, studentPhone, enteredCode) {
  try {
    const res = apiGetExamSessions();
    if (!res.success) return res;
    const session = res.data.find(s => s.id === sessionId);
    if (!session) return { success: false, error: "সেশন পাওয়া যায়নি (Session not found)" };
    if (!session.isActive) return { success: false, error: "সেশন সক্রিয় নয় (Session is inactive)" };
    const storedCode = String(session.code || "").trim().toUpperCase();
    const givenCode = String(enteredCode || "").trim().toUpperCase();
    if (session.codeEnabled && storedCode !== givenCode) return { success: false, error: "wrong_code" };
    const uids = session.participantUids || [];
    if (uids.indexOf(userId) === -1) {
      uids.push(userId);
      updateRow("examSessions", sessionId, { participantUids: JSON.stringify(uids) });
      saveRow("attendance", {
        sessionId, studentId: userId,
        studentName: studentName || "Student",
        studentPhone: studentPhone || "0000000000",
        joinedTime: S.nowIso(),
      });
    }
    return { success: true };
  } catch (err) { return { success: false, error: String(err) }; }
}

function apiSubmitExamResult(resultData, session) {
  try {
    if (!resultData) return { success: false, error: "No data provided" };
    if (!session || !session.userId) return { success: false, error: "Unauthorized access: Valid session required", code: 401 };
    resultData.studentId = String(session.userId);
    const rid = resultData.id || resultData.resultId;
    if (rid) {
      resultData.id = String(rid).trim();
      if (S.findRowById("examResults", resultData.id)) return { success: true, data: resultData, duplicate: true };
    }
    return { success: true, data: saveRow("examResults", resultData) };
  } catch (err) { return { success: false, error: String(err) }; }
}

function apiGetStudentDashboardData(batchIds, studentId, session) {
  try {
    if (session && session.role !== 'admin') studentId = session.userId;
    const sid = String(studentId).trim();
    return {
      success: true,
      data: {
        results: readSheet("examResults").filter(r => String(r.studentId).trim() === sid),
        attendance: readSheet("attendance").filter(a => String(a.studentId).trim() === sid),
      },
    };
  } catch (err) { return { success: false, error: String(err) }; }
}

function apiGetExamResults(session) {
  try {
    let all = readSheet("examResults");
    if (session && session.role !== 'admin') all = all.filter(r => String(r.studentId).trim() === String(session.userId).trim());
    return { success: true, data: all };
  } catch (err) { return { success: false, error: String(err) }; }
}

function apiHasSubmitted(examId, studentId, session) {
  try {
    if (session && session.role !== 'admin') studentId = session.userId;
    if (!examId || !studentId) return { success: true, submitted: false };
    const e = String(examId).trim(), s = String(studentId).trim();
    const hit = readSheet("examResults").some(r => String(r.examId).trim() === e && String(r.studentId).trim() === s);
    return { success: true, submitted: hit };
  } catch (err) { return { success: false, error: String(err) }; }
}

function apiDeleteExamResult(resultId) {
  try { return { success: deleteRow("examResults", resultId) }; }
  catch (err) { return { success: false, error: String(err) }; }
}

function apiDeleteMultipleExamResults(resultIds) {
  try {
    if (!Array.isArray(resultIds) || resultIds.length === 0) return { success: true, count: 0 };
    const set = new Set(resultIds.map(String));
    return { success: true, count: S.deleteWhere("examResults", o => set.has(String(o.id))) };
  } catch (err) { return { success: false, error: String(err) }; }
}

function apiGetAttendance() {
  try { return { success: true, data: readSheet("attendance") }; }
  catch (err) { return { success: false, error: String(err) }; }
}

// =========================================================================
// ANNOUNCEMENT / SETTINGS
// =========================================================================
function apiGetAnnouncement() {
  try { return { success: true, data: S.getProp("announcement") || "" }; }
  catch (err) { return { success: false, error: String(err) }; }
}
function apiSaveAnnouncement(message) {
  try { S.setProp("announcement", message || ""); return { success: true }; }
  catch (err) { return { success: false, error: String(err) }; }
}
function apiGetSettings() {
  try {
    const saved = S.getProp("appSettings");
    if (saved) return { success: true, data: JSON.parse(saved) };
    return { success: true, data: { adminUpiId: "", adminPayeeName: "", enablePaymentSystem: true } };
  } catch (err) { return { success: false, error: String(err) }; }
}
function apiSaveSettings(settings) {
  try {
    const clean = {
      adminUpiId: String((settings && settings.adminUpiId) || "").trim(),
      adminPayeeName: String((settings && settings.adminPayeeName) || "").trim(),
      enablePaymentSystem: settings ? (settings.enablePaymentSystem !== false) : true,
    };
    S.setProp("appSettings", JSON.stringify(clean));
    return { success: true };
  } catch (err) { return { success: false, error: String(err) }; }
}
function apiVerifyGatewayPayment() {
  return { success: false, error: "Razorpay payment gateway has been disabled. Please submit payment via UPI or Cash." };
}

// PDF upload stays on Google Drive (the file server downloads from Drive by file id)
async function apiUploadFileToDrive(base64Data, fileName, folderId) {
  try { return await relay.uploadToDrive(base64Data, fileName, folderId); }
  catch (err) { return { success: false, error: String(err) }; }
}

function apiFixStudentId(oldId, newId) {
  try {
    let n = 0;
    for (const s of ["payments", "attendance", "examResults"]) {
      n += S.mapRows(s, o => { if (String(o.studentId === undefined ? '' : o.studentId).trim() === oldId) { o.studentId = newId; return o; } return null; });
    }
    return { success: true, updatedRows: n };
  } catch (err) { return { success: false, error: String(err) }; }
}

// =========================================================================
// DISPATCH (same allowlists as Code.gs doPost)
// =========================================================================
const PUBLIC_ACTIONS = ["apiLoginUser", "apiRegisterUser", "apiCheckApplicationStatus", "apiSendOTP", "apiVerifyOTPAndReset"];
const ADMIN_ACTIONS = ["apiGetUsers", "apiDeleteUser", "apiUpdateUserStatus", "apiAdminResetPasscode", "apiUpdateUserPasscode", "apiSaveBatch", "apiDeleteBatch", "apiSaveLibraryItem", "apiDeleteLibraryItem", "apiDeleteMultipleLibraryItems", "apiShareLibraryItem", "apiUpdateLibrarySequences", "apiUploadFileToDrive", "apiUpdatePaymentStatus", "apiDeleteExamResult", "apiDeleteMultipleExamResults", "apiSaveAnnouncement", "apiSaveSettings", "apiCreateExamSession", "apiEndExamSession", "apiBulkUpdatePaymentStatus", "apiSetStudentExcusedMonths", "apiDeletePayment"];
const USER_ACTIONS = ["apiGetSettings", "apiGetPayments", "apiGetPaymentProof", "apiGetAttendance", "apiGetExamResults", "apiGetLibraryItemDetails", "apiChangePasscode", "apiLogoutUser", "apiSaveUser", "apiJoinExamSession", "apiSubmitExamResult", "apiSubmitPaymentRequest", "apiGetStudentDashboardData", "apiHasSubmitted", "apiCreateNotification", "apiDeleteNotification", "apiGetNotifications", "apiGetMyProfile", "apiGetLibrary", "apiGetBatches", "apiGetExamSessions", "apiGetAnnouncement"];
const ACTIONS_NEEDING_SESSION = ["apiGetSettings", "apiGetPayments", "apiGetPaymentProof", "apiGetAttendance", "apiGetExamResults", "apiGetLibraryItemDetails", "apiChangePasscode", "apiLogoutUser", "apiSaveUser", "apiJoinExamSession", "apiSubmitExamResult", "apiSubmitPaymentRequest", "apiGetStudentDashboardData", "apiUpdatePaymentStatus", "apiBulkUpdatePaymentStatus", "apiSetStudentExcusedMonths", "apiDeletePayment", "apiHasSubmitted", "apiCreateNotification", "apiDeleteNotification", "apiGetNotifications", "apiGetMyProfile"];
const READ_ONLY = new Set(["apiGetUsers", "apiGetBatches", "apiGetLibrary", "apiGetLibraryItemDetails", "apiGetPayments", "apiGetPaymentProof", "apiGetNotifications", "apiGetMyProfile", "apiGetExamSessions", "apiGetStudentDashboardData", "apiGetExamResults", "apiHasSubmitted", "apiGetAttendance", "apiGetAnnouncement", "apiGetSettings", "apiCheckApplicationStatus"]);

const FUNCS = {
  apiLoginUser, apiRegisterUser, apiCheckApplicationStatus, apiSendOTP, apiVerifyOTPAndReset,
  apiGetUsers, apiDeleteUser, apiUpdateUserStatus, apiAdminResetPasscode, apiUpdateUserPasscode,
  apiSaveBatch, apiDeleteBatch, apiSaveLibraryItem, apiDeleteLibraryItem, apiDeleteMultipleLibraryItems,
  apiShareLibraryItem, apiUpdateLibrarySequences, apiUploadFileToDrive, apiUpdatePaymentStatus,
  apiDeleteExamResult, apiDeleteMultipleExamResults, apiSaveAnnouncement, apiSaveSettings,
  apiCreateExamSession, apiEndExamSession, apiBulkUpdatePaymentStatus, apiSetStudentExcusedMonths, apiDeletePayment,
  apiGetSettings, apiGetPayments, apiGetPaymentProof, apiGetAttendance, apiGetExamResults, apiGetLibraryItemDetails,
  apiChangePasscode, apiLogoutUser, apiSaveUser, apiJoinExamSession, apiSubmitExamResult, apiSubmitPaymentRequest,
  apiGetStudentDashboardData, apiHasSubmitted, apiCreateNotification, apiDeleteNotification, apiGetNotifications,
  apiGetMyProfile, apiGetLibrary, apiGetBatches, apiGetExamSessions, apiGetAnnouncement,
  // not allow-listed (same as GAS) but kept for parity
  apiHealStudentIds, apiFixStudentId, apiVerifyGatewayPayment,
};

const CLIENT_SECURITY_TOKEN = process.env.CLIENT_SECURITY_TOKEN || 'MondalCoachingSecureToken2026!';

async function handleRpc(requestData) {
  const action = requestData && requestData.action;
  const args = Array.isArray(requestData && requestData.args) ? requestData.args.slice() : [];
  const token = requestData && requestData.token;
  const func = action && Object.prototype.hasOwnProperty.call(FUNCS, action) ? FUNCS[action] : null;
  if (!func) return { success: false, error: 'Forbidden: action not allowed', code: 404 };

  const isPublic = PUBLIC_ACTIONS.includes(action), isAdmin = ADMIN_ACTIONS.includes(action), isUser = USER_ACTIONS.includes(action);
  if (!isPublic && !isAdmin && !isUser) return { success: false, error: 'Forbidden: action not allowed', code: 403 };

  let session = null;
  if (isPublic) {
    if (token !== CLIENT_SECURITY_TOKEN) {
      session = validateSessionToken(token);
      if (!session) return { success: false, error: 'Unauthorized access: Invalid security token or session', code: 401 };
    }
  } else {
    if (!token || token === CLIENT_SECURITY_TOKEN) return { success: false, error: 'Unauthorized access: Valid session token required. Please login again.', code: 401, forceLogout: true };
    session = validateSessionToken(token);
    if (!session) return { success: false, error: 'Unauthorized access: Invalid or expired session token. Please login again.', code: 401, forceLogout: true };
    if (isAdmin && session.role !== 'admin') return { success: false, error: 'Forbidden: Admin access required', code: 403 };
  }
  if (ACTIONS_NEEDING_SESSION.includes(action)) args.push(session);

  let result;
  if (READ_ONLY.has(action) || action === 'apiUploadFileToDrive' || action === 'apiSendOTP') {
    result = await func.apply(null, args);
  } else {
    // every write runs inside one SQLite transaction: all-or-nothing
    result = S.tx(() => func.apply(null, args));
  }
  S.audit(action, session && session.userId, !(result && result.success === false));
  if (result && typeof result === 'object' && result.success === false) return result;
  return { success: true, data: result };
}

module.exports = { handleRpc, purgeExpiredSessions, FUNCS, validateSessionToken, _internal: { hashPasscode, cleanPhone, createSession } };

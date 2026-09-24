'use strict';
// mc-api v2: the whole app backend on the VPS (replaces Google Apps Script).
const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const S = require('./store');
const { handleRpc, purgeExpiredSessions } = require('./api');

const PORT = Number(process.env.PORT || 4100);
const SYNC_SECRET = (process.env.HMAC_SYNC_SECRET || '').trim();
const ALLOW_IMPORT = process.env.ALLOW_IMPORT === '1';
const BACKUP_DIR = path.join(S.DATA_DIR, 'backups');
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true, mode: 0o700 });

const app = express();
app.disable('x-powered-by');

// ---------- CORS (only our Vercel app + local dev) ----------
const ORIGIN_RE = /^https:\/\/mondal-coachingmondal-coaching(-[a-z0-9-]+)?\.vercel\.app$/i;
const DEV = new Set(['http://localhost:5173', 'http://localhost:4173', 'http://127.0.0.1:5173', 'http://127.0.0.1:4173']);
const EXTRA = new Set(String(process.env.EXTRA_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean));
function originOk(o) { return !o || ORIGIN_RE.test(o) || DEV.has(o) || EXTRA.has(o); }
app.use((req, res, next) => {
  const o = req.headers.origin;
  if (o && originOk(o)) {
    res.setHeader('Access-Control-Allow-Origin', o);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  if (req.method === 'OPTIONS') return res.status(o && originOk(o) ? 204 : 403).end();
  if (o && !originOk(o)) return res.status(403).json({ success: false, code: 403, error: 'Origin not allowed' });
  next();
});

// ---------- health ----------
app.get('/health', (req, res) => {
  res.json({ success: true, service: 'mc-api-v2', time: new Date().toISOString(), counts: S.counts(), importEnabled: ALLOW_IMPORT });
});

// ---------- RPC: same request/response as the Apps Script doPost ----------
app.post('/rpc', express.text({ type: '*/*', limit: '60mb' }), async (req, res) => {
  let body;
  try { body = JSON.parse(req.body || '{}'); }
  catch (e) { return res.json({ success: false, error: 'No data provided', code: 400 }); }
  const t0 = Date.now();
  try {
    const out = await handleRpc(body);
    res.setHeader('Server-Timing', 'app;dur=' + (Date.now() - t0));
    res.json(out);
  } catch (err) {
    console.error('[rpc]', body && body.action, err);
    res.json({ success: false, error: String(err), code: 500 });
  }
});

// ---------- signed import (Google Sheet -> VPS), only while ALLOW_IMPORT=1 ----------
function verifySig(req) {
  if (!SYNC_SECRET) return false;
  const given = String(req.headers['x-mc-signature'] || '').replace(/^sha256=/, '').toLowerCase();
  const exp = crypto.createHmac('sha256', SYNC_SECRET).update(req.rawBody || '').digest('hex');
  return given.length === exp.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(exp));
}
const staging = { sheets: {}, headers: {}, props: null, startedAt: null };

app.post('/import', express.raw({ type: '*/*', limit: '60mb' }), (req, res) => {
  req.rawBody = req.body;
  if (!ALLOW_IMPORT) return res.status(403).json({ success: false, error: 'Import disabled (ALLOW_IMPORT!=1)' });
  if (!verifySig(req)) return res.status(401).json({ success: false, error: 'Bad signature' });
  let msg;
  try { msg = JSON.parse(req.body.toString('utf8')); } catch (e) { return res.status(400).json({ success: false, error: 'Bad JSON' }); }
  if (msg.step === 'begin') {
    staging.sheets = {}; staging.headers = {}; staging.props = null; staging.startedAt = Date.now();
    return res.json({ success: true });
  }
  if (msg.step === 'rows') {
    const sh = String(msg.sheet || '');
    if (!sh) return res.status(400).json({ success: false, error: 'sheet missing' });
    if (!staging.sheets[sh]) staging.sheets[sh] = [];
    if (Array.isArray(msg.headers)) staging.headers[sh] = msg.headers;
    for (const r of (msg.rows || [])) staging.sheets[sh].push(r);
    return res.json({ success: true, staged: staging.sheets[sh].length });
  }
  if (msg.step === 'props') { staging.props = msg.props || {}; return res.json({ success: true }); }
  if (msg.step === 'commit') {
    const expected = msg.expectedCounts || {};
    const mismatch = [];
    for (const sh of Object.keys(expected)) {
      const got = (staging.sheets[sh] || []).length;
      if (got !== Number(expected[sh])) mismatch.push(sh + ': expected ' + expected[sh] + ' got ' + got);
    }
    if (mismatch.length) return res.status(409).json({ success: false, error: 'Row count mismatch, nothing saved', mismatch });
    try { S.backupTo(path.join(BACKUP_DIR, 'pre-import-' + Date.now() + '.db')); } catch (e) {}
    S.replaceSheets(staging.sheets, staging.headers, staging.props);
    const counts = S.counts();
    staging.sheets = {}; staging.headers = {}; staging.props = null;
    return res.json({ success: true, counts });
  }
  return res.status(400).json({ success: false, error: 'unknown step' });
});

// ---------- backups: hourly (keep 48) + daily (keep 60) ----------
function prune(prefix, keep) {
  const files = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith(prefix)).sort();
  while (files.length > keep) { try { fs.unlinkSync(path.join(BACKUP_DIR, files.shift())); } catch (e) { break; } }
}
function stamp() { return new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, ''); }
function runBackups() {
  try {
    const h = path.join(BACKUP_DIR, 'hourly-' + stamp() + '.db');
    S.backupTo(h); prune('hourly-', 48);
    const day = new Date().toISOString().slice(0, 10);
    const d = path.join(BACKUP_DIR, 'daily-' + day + '.db');
    if (!fs.existsSync(d)) { fs.copyFileSync(h, d); prune('daily-', 60); }
  } catch (e) { console.error('[backup]', e); }
  try { S.tx(() => purgeExpiredSessions()); } catch (e) {}
}
setTimeout(runBackups, 30 * 1000).unref();
setInterval(runBackups, 60 * 60 * 1000).unref();

// Signed download of the latest backup (for off-server copies to the owner's PC)
app.get('/backup/latest', (req, res) => {
  const ts = Number(req.query.ts || 0);
  const sig = String(req.query.sig || '');
  if (!SYNC_SECRET || !ts || Math.abs(Date.now() - ts) > 5 * 60 * 1000) return res.status(401).end();
  const exp = crypto.createHmac('sha256', SYNC_SECRET).update('backup|' + ts).digest('hex');
  if (sig.length !== exp.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(exp))) return res.status(401).end();
  const files = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith('hourly-')).sort();
  if (!files.length) return res.status(404).end();
  res.download(path.join(BACKUP_DIR, files[files.length - 1]));
});

app.use((req, res) => res.status(404).json({ success: false, error: 'Not found' }));

app.listen(PORT, () => console.log(`[mc-api-v2] listening on ${PORT}, import ${ALLOW_IMPORT ? 'ENABLED' : 'disabled'}`));

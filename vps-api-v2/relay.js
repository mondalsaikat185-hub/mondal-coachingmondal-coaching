'use strict';
// Google-only jobs (Drive upload for PDFs, e-mail for OTP) are done by Apps Script.
// The request is signed with the shared MC_SYNC_SECRET so only this server can use it.
const crypto = require('crypto');

const RELAY_URL = (process.env.GAS_RELAY_URL || '').trim();
const SECRET = (process.env.HMAC_SYNC_SECRET || '').trim();

async function call(op, args) {
  if (!RELAY_URL || !SECRET) return { success: false, error: 'Google relay not configured' };
  const ts = Date.now();
  const argsJson = JSON.stringify(args);
  const bodyHash = crypto.createHash('sha256').update(argsJson, 'utf8').digest('hex');
  const sig = crypto.createHmac('sha256', SECRET).update(op + '|' + ts + '|' + bodyHash, 'utf8').digest('hex');
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 120000);
  try {
    const res = await fetch(RELAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'relayFromVps', op, argsJson, ts, sig }),
      redirect: 'follow',
      signal: ctrl.signal,
    });
    const json = await res.json();
    if (json && json.success && json.data) return json.data;
    return { success: false, error: (json && json.error) || ('relay HTTP ' + res.status) };
  } catch (e) {
    return { success: false, error: 'relay failed: ' + e.message };
  } finally { clearTimeout(t); }
}

module.exports = {
  uploadToDrive: (base64Data, fileName, folderId) => call('uploadToDrive', [base64Data, fileName, folderId || '']),
  sendMail: (to, subject, body) => call('sendMail', [to, subject, body]),
};

'use strict';
// Sheet-compatible row store on SQLite.
// Every Google Sheet tab becomes a "sheet" here. Each row is one JSON object.
// Behaviour copies Code.gs readSheet/saveRow/updateRow/deleteRow/deleteMultipleRows
// so that every API function can be ported line-by-line.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

process.umask(0o077);

const DATA_DIR = process.env.DATA_DIR || '/data';
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });

const db = new DatabaseSync(path.join(DATA_DIR, 'mc2.db'));
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA synchronous = FULL;');
db.exec('PRAGMA busy_timeout = 5000;');
db.exec(`
  CREATE TABLE IF NOT EXISTS rows (
    rk INTEGER PRIMARY KEY AUTOINCREMENT,
    sheet TEXT NOT NULL,
    id TEXT NOT NULL DEFAULT '',
    data TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_rows_sheet_id ON rows(sheet, id);
  CREATE TABLE IF NOT EXISTS headers (
    sheet TEXT PRIMARY KEY,
    cols TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS props (
    key TEXT PRIMARY KEY,
    value TEXT
  );
  CREATE TABLE IF NOT EXISTS audit (
    ts TEXT NOT NULL,
    action TEXT NOT NULL,
    user_id TEXT,
    ok INTEGER NOT NULL
  );
`);

const st = {
  rowsBySheet: db.prepare('SELECT rk, data FROM rows WHERE sheet = ? ORDER BY rk'),
  rowById: db.prepare('SELECT rk, data FROM rows WHERE sheet = ? AND id = ? ORDER BY rk LIMIT 1'),
  insert: db.prepare('INSERT INTO rows (sheet, id, data) VALUES (?, ?, ?)'),
  updateRk: db.prepare('UPDATE rows SET id = ?, data = ? WHERE rk = ?'),
  deleteRk: db.prepare('DELETE FROM rows WHERE rk = ?'),
  countSheet: db.prepare('SELECT COUNT(*) AS c FROM rows WHERE sheet = ?'),
  sheets: db.prepare('SELECT sheet, COUNT(*) AS c FROM rows GROUP BY sheet ORDER BY sheet'),
  hdrGet: db.prepare('SELECT cols FROM headers WHERE sheet = ?'),
  hdrSet: db.prepare('INSERT INTO headers (sheet, cols) VALUES (?, ?) ON CONFLICT(sheet) DO UPDATE SET cols = excluded.cols'),
  propGet: db.prepare('SELECT value FROM props WHERE key = ?'),
  propSet: db.prepare('INSERT INTO props (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'),
  propDel: db.prepare('DELETE FROM props WHERE key = ?'),
  audit: db.prepare('INSERT INTO audit (ts, action, user_id, ok) VALUES (?, ?, ?, ?)'),
};

function uuid() { return crypto.randomUUID(); }
function nowIso() { return new Date().toISOString(); }

// ---------- headers (keeps "every row has every column" like a sheet) ----------
function getHeaders(sheet) {
  const r = st.hdrGet.get(sheet);
  if (!r) return [];
  try { return JSON.parse(r.cols); } catch (e) { return []; }
}
function addHeaders(sheet, keys) {
  const cols = getHeaders(sheet);
  let changed = false;
  for (const k of keys) {
    if (cols.indexOf(k) === -1) { cols.push(k); changed = true; }
  }
  if (changed) st.hdrSet.run(sheet, JSON.stringify(cols));
  return cols;
}
function ensureSheetHeaders(sheet, required) { addHeaders(sheet, required); }

function fill(sheet, obj) {
  const cols = getHeaders(sheet);
  const out = {};
  for (const c of cols) out[c] = (obj[c] !== undefined && obj[c] !== null) ? obj[c] : '';
  for (const k of Object.keys(obj)) if (!(k in out)) out[k] = obj[k];
  return out;
}

// Like saveRow: objects are stored as JSON strings
function serializeValues(obj) {
  const out = {};
  for (const k of Object.keys(obj)) {
    let v = obj[k];
    if (v === undefined) continue;
    if (typeof v === 'object' && v !== null) v = JSON.stringify(v);
    out[k] = v;
  }
  return out;
}

// ---------- generic sheet API ----------
function readSheet(sheet) {
  const list = st.rowsBySheet.all(sheet);
  const res = new Array(list.length);
  for (let i = 0; i < list.length; i++) {
    let o;
    try { o = JSON.parse(list[i].data); } catch (e) { o = {}; }
    res[i] = fill(sheet, o);
  }
  return res;
}

function findRowById(sheet, id) {
  const r = st.rowById.get(sheet, String(id).trim());
  if (!r) return null;
  return { rk: r.rk, obj: JSON.parse(r.data) };
}

function saveRow(sheet, dataObj) {
  if (!dataObj.id) dataObj.id = uuid();
  if (!dataObj.createdAt) dataObj.createdAt = nowIso();
  const stored = serializeValues(dataObj);
  addHeaders(sheet, Object.keys(stored));
  st.insert.run(sheet, String(stored.id).trim(), JSON.stringify(stored));
  return dataObj;
}

function updateRow(sheet, id, updateObj) {
  const found = findRowById(sheet, id);
  if (!found) return null;
  updateObj.updatedAt = nowIso();
  const upd = serializeValues(updateObj);
  const merged = Object.assign({}, found.obj, upd);
  addHeaders(sheet, Object.keys(merged));
  st.updateRk.run(String(merged.id !== undefined ? merged.id : id).trim(), JSON.stringify(merged), found.rk);
  return fill(sheet, merged);
}

function deleteRow(sheet, id) {
  const found = findRowById(sheet, id);
  if (!found) return false;
  st.deleteRk.run(found.rk);
  return true;
}

function deleteMultipleRows(sheet, columnName, columnValue) {
  const want = String(columnValue).trim();
  const colLc = String(columnName).trim().toLowerCase();
  const list = st.rowsBySheet.all(sheet);
  let count = 0;
  for (const r of list) {
    let o;
    try { o = JSON.parse(r.data); } catch (e) { continue; }
    const key = Object.keys(o).find(k => k.trim().toLowerCase() === colLc);
    if (key !== undefined && String(o[key]).trim() === want) {
      st.deleteRk.run(r.rk);
      count++;
    }
  }
  return count;
}

// Rewrite one column value in-place for every row matching a predicate
function mapRows(sheet, fn) {
  const list = st.rowsBySheet.all(sheet);
  let changed = 0;
  for (const r of list) {
    let o;
    try { o = JSON.parse(r.data); } catch (e) { continue; }
    const next = fn(o);
    if (next) {
      st.updateRk.run(String(next.id !== undefined ? next.id : '').trim(), JSON.stringify(next), r.rk);
      changed++;
    }
  }
  return changed;
}

function deleteWhere(sheet, pred) {
  const list = st.rowsBySheet.all(sheet);
  let count = 0;
  for (const r of list) {
    let o;
    try { o = JSON.parse(r.data); } catch (e) { continue; }
    if (pred(o)) { st.deleteRk.run(r.rk); count++; }
  }
  return count;
}

// ---------- script properties replacement ----------
function getProp(key) { const r = st.propGet.get(key); return r ? r.value : null; }
function setProp(key, value) { st.propSet.run(key, String(value)); }
function delProp(key) { st.propDel.run(key); }

// ---------- transactions ----------
function tx(fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const out = fn();
    db.exec('COMMIT');
    return out;
  } catch (e) {
    try { db.exec('ROLLBACK'); } catch (e2) {}
    throw e;
  }
}

function counts() {
  const out = {};
  for (const r of st.sheets.all()) out[r.sheet] = r.c;
  return out;
}

function audit(action, userId, ok) {
  try { st.audit.run(nowIso(), action, userId || null, ok ? 1 : 0); } catch (e) {}
}

// ---------- import (replace whole sheets atomically) ----------
function replaceSheets(sheetsMap, headersMap, propsMap) {
  tx(() => {
    for (const sheet of Object.keys(sheetsMap)) {
      db.prepare('DELETE FROM rows WHERE sheet = ?').run(sheet);
      const cols = (headersMap && headersMap[sheet]) || [];
      st.hdrSet.run(sheet, JSON.stringify(cols));
      for (const row of sheetsMap[sheet]) {
        addHeaders(sheet, Object.keys(row));
        st.insert.run(sheet, String(row.id === undefined || row.id === null ? '' : row.id).trim(), JSON.stringify(row));
      }
    }
    if (propsMap) {
      for (const k of Object.keys(propsMap)) {
        if (propsMap[k] === null || propsMap[k] === undefined) delProp(k); else setProp(k, propsMap[k]);
      }
    }
  });
}

function backupTo(file) {
  db.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
}

module.exports = {
  db, uuid, nowIso,
  readSheet, saveRow, updateRow, deleteRow, deleteMultipleRows, mapRows, deleteWhere,
  findRowById, ensureSheetHeaders, getHeaders,
  getProp, setProp, delProp, tx, counts, audit, replaceSheets, backupTo, DATA_DIR,
};

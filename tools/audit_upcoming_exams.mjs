// tools/audit_upcoming_exams.mjs
// TASK R29: Upcoming exam audit across all batches.
// Verifies:
// a) every examId exists and isActive
// b) present in scheduledStartTimeMap with exact IST start time
// c) visible to students of that batch (directly or via ancestor folder)
// Prints markdown table: batch | date | time | exam title | in map? | time ok? | visible? | status

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';

const dbPath = process.argv[2] || process.env.DATA_DIR || (fs.existsSync('/data/mc2.db') ? '/data/mc2.db' : './data/mc2.db');

if (!fs.existsSync(dbPath)) {
  console.error(`Database not found at: ${dbPath}`);
  process.exit(1);
}

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA busy_timeout = 5000;');

function readSheet(sheet) {
  const rows = db.prepare('SELECT rk, data FROM rows WHERE sheet = ? ORDER BY rk').all(sheet);
  const out = [];
  for (const r of rows) {
    try {
      const obj = JSON.parse(r.data);
      obj._rk = r.rk;
      out.push(obj);
    } catch (e) {}
  }
  return out;
}

function parseMap(v) {
  if (!v) return {};
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch (e) { return {}; }
}

function parseIdList(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return [];
    if (s.startsWith('[') && s.endsWith(']')) {
      try {
        const arr = JSON.parse(s);
        if (Array.isArray(arr)) return arr.map(String).filter(Boolean);
      } catch (e) {}
    }
    return s.split(',').map(x => x.trim()).filter(Boolean);
  }
  return [];
}

function istDateStr(ms) {
  const d = new Date(ms + 19800000);
  return d.toISOString().slice(0, 10);
}

function examStartIso(examDate, examStartTime) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(examDate || '').trim());
  const tm = /^([01]\d|2[0-3]):[0-5]\d$/.exec(String(examStartTime || '').trim());
  if (!m || !tm) return '';
  const [hh, mm] = examStartTime.split(':').map(Number);
  const [y, mon, d] = examDate.split('-').map(Number);
  const utc = new Date(Date.UTC(y, mon - 1, d, hh, mm, 0) - 19800000);
  return utc.toISOString();
}

function isActiveItem(it) {
  if (!it) return false;
  if (it.isDeleted === true || it.isDeleted === 'true') return false;
  if (it.status && String(it.status).toLowerCase() !== 'active') return false;
  return true;
}

function isExamReq(n) {
  if (!n) return false;
  const t = String(n.type || '').trim().toLowerCase();
  return t === 'exam_request' || t === 'exam';
}

function runAudit() {
  const nowMs = Date.now();
  const todayIso = istDateStr(nowMs);
  const lib = readSheet('library');
  const libById = {}; for (const it of lib) libById[String(it.id)] = it;
  const batches = readSheet('batches');
  const batchesById = {}; for (const b of batches) batchesById[String(b.id)] = b;
  const notifs = readSheet('notifications');

  const upcomingReqs = notifs.filter(n => isExamReq(n) && n.status === 'scheduled' && n.examDate >= todayIso);

  const results = [];
  let allPass = true;

  for (const n of upcomingReqs) {
    const b = batchesById[String(n.batchId)];
    const bName = b ? (b.name || '') : String(n.batchName || n.batchId);
    if (!b) {
      allPass = false;
      results.push({
        batch: bName,
        date: n.examDate,
        time: n.examStartTime,
        examTitle: 'Batch Missing',
        inMap: '✗',
        timeOk: '✗',
        visible: '✗',
        status: '✗',
        error: `Batch ${n.batchId} missing`
      });
      continue;
    }

    const assigned = parseMap(b.assignedItemsMap);
    const scheduled = parseMap(b.scheduledStartTimeMap);
    const examIds = parseIdList(n.examIds);

    const timeDisplay = n.examStartTime || (n.startIso ? new Date(new Date(n.startIso).getTime() + 19800000).toISOString().slice(11, 16) : '');

    for (const eid of examIds) {
      const it = libById[eid];
      const examTitle = it ? (it.title || eid) : eid;
      const existsAndActive = !!(it && String(it.type) === 'exam' && isActiveItem(it));
      
      const inMap = !!scheduled[eid];
      const timeOk = inMap && (scheduled[eid] === n.startIso || (n.examDate && n.examStartTime && scheduled[eid] === examStartIso(n.examDate, n.examStartTime)));

      let visible = !!assigned[eid];
      if (!visible && it) {
        let cur = it;
        let depth = 0;
        while (cur && cur.parentId && depth < 20) {
          if (assigned[String(cur.parentId)]) { visible = true; break; }
          cur = libById[String(cur.parentId)];
          depth++;
        }
      }

      const pass = existsAndActive && inMap && timeOk && visible;
      if (!pass) allPass = false;

      results.push({
        batch: bName,
        date: n.examDate,
        time: timeDisplay,
        examTitle,
        inMap: inMap ? '✓' : '✗',
        timeOk: timeOk ? '✓' : '✗',
        visible: visible ? '✓' : '✗',
        status: pass ? '✓' : '✗'
      });
    }
  }

  // Print Markdown Table
  console.log('| batch | date | time | exam title | in map? | time ok? | visible? | status |');
  console.log('|---|---|---|---|:---:|:---:|:---:|:---:|');
  for (const r of results) {
    console.log(`| ${r.batch} | ${r.date} | ${r.time} | ${r.examTitle} | ${r.inMap} | ${r.timeOk} | ${r.visible} | ${r.status} |`);
  }

  return { allPass, count: results.length, results };
}

const res = runAudit();
console.log(`\nAudit complete: ${res.count} upcoming exams checked. All passed: ${res.allPass}`);
if (!res.allPass) process.exit(1);

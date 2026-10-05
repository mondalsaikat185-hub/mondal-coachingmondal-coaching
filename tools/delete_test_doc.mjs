// tools/delete_test_doc.mjs
// R23 data fix — Delete "Test Regression PDF Document" row (and remove from batches if present).
// Backs up first, applies in ONE transaction, verifies, shows before/after row count (-1).
// Usage: node tools/delete_test_doc.mjs /data/mc2.db

import { DatabaseSync } from 'node:sqlite';

const path = process.argv[2] || '/data/mc2.db';
const db = new DatabaseSync(path);
db.exec('PRAGMA busy_timeout=10000;');

// 1. Backup first
const bak = path.replace(/\.db$/, '') + '-pre-r23-' + Date.now() + '.db';
db.exec(`VACUUM INTO '${bak.replace(/'/g, "''")}'`);
console.log('BACKUP:', bak);

// 2. Locate the row
const rows = db.prepare("SELECT rk, data FROM rows WHERE sheet='library'").all();
let targetRk = null;
let targetId = null;
let targetDoc = null;

for (const r of rows) {
  const d = JSON.parse(r.data);
  if (d.fileName === 'test_regression_doc.pdf' || d.title === 'Test Regression PDF Document') {
    targetRk = r.rk;
    targetId = d.id;
    targetDoc = d;
    break;
  }
}

if (!targetRk) {
  console.error('Target "Test Regression PDF Document" not found — nothing done.');
  process.exit(1);
}

console.log(`Found target to delete: rk=${targetRk}, id=${targetId}, title="${targetDoc.title}", fileName="${targetDoc.fileName}"`);

const before = db.prepare("SELECT COUNT(*) c FROM rows").get().c;
const beforeLib = db.prepare("SELECT COUNT(*) c FROM rows WHERE sheet='library'").get().c;

db.exec('BEGIN IMMEDIATE');
try {
  // Delete the library row
  db.prepare("DELETE FROM rows WHERE rk = ?").run(targetRk);

  // Clean from batches assignedItemsMap if present
  const batchRows = db.prepare("SELECT rk, data FROM rows WHERE sheet='batches'").all();
  let batchesUpdated = 0;
  for (const b of batchRows) {
    const d = JSON.parse(b.data);
    let map = d.assignedItemsMap;
    let modified = false;
    if (typeof map === 'string') {
      try {
        const parsed = JSON.parse(map || '{}');
        if (parsed[targetId]) {
          delete parsed[targetId];
          d.assignedItemsMap = JSON.stringify(parsed);
          modified = true;
        }
      } catch (e) {}
    } else if (map && typeof map === 'object') {
      if (map[targetId]) {
        delete map[targetId];
        modified = true;
      }
    }
    if (modified) {
      db.prepare("UPDATE rows SET data = ? WHERE rk = ?").run(JSON.stringify(d), b.rk);
      batchesUpdated++;
    }
  }

  db.exec('COMMIT');
  console.log(`Successfully deleted row. Batches cleaned: ${batchesUpdated}`);
} catch (e) {
  db.exec('ROLLBACK');
  console.error('ROLLBACK:', e);
  process.exit(1);
}

const after = db.prepare("SELECT COUNT(*) c FROM rows").get().c;
const afterLib = db.prepare("SELECT COUNT(*) c FROM rows WHERE sheet='library'").get().c;

console.log(`\nLibrary count: ${beforeLib} -> ${afterLib} (diff: ${afterLib - beforeLib})`);
console.log(`Total row count: ${before} -> ${after} (diff: ${after - before})`);

if (before - after !== 1) {
  console.error(`ERROR: Expected exactly 1 row deleted, but diff was ${before - after}!`);
  process.exit(1);
}
console.log('ROW COUNT CHECK PASSED (-1).');

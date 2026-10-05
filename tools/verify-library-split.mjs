// tools/verify-library-split.mjs
// Verifies src/lib/library-split.ts against _dbcopy/mc2_snapshot.db
// Usage: node --experimental-strip-types tools/verify-library-split.mjs [_dbcopy/mc2_snapshot.db]

import { DatabaseSync } from 'node:sqlite';
import { visibleIds, buildSide } from '../src/lib/library-split.ts';

const dbPath = process.argv[2] || '_dbcopy/mc2_snapshot.db';
const db = new DatabaseSync(dbPath, { readOnly: true });

const libRows = db.prepare("SELECT data FROM rows WHERE sheet='library'").all();
const items = libRows.map(r => JSON.parse(r.data));

const batchRows = db.prepare("SELECT data FROM rows WHERE sheet='batches'").all();
const batches = batchRows.map(r => JSON.parse(r.data));

// 1. ADMIN (all files)
const adminVisible = visibleIds(items, batches, null);
const adminExams = buildSide(items, adminVisible, 'exam');
const adminNotes = buildSide(items, adminVisible, 'note');
console.log(`ADMIN (all files): exams ${adminExams.files.length}, notes ${adminNotes.files.length}`);

// 2. Batches
for (const b of batches) {
  const vis = visibleIds(items, batches, [b.id]);
  const examSide = buildSide(items, vis, 'exam');
  const noteSide = buildSide(items, vis, 'note');
  console.log(`${b.name}: exams ${examSide.files.length}, notes ${noteSide.files.length}`);
}

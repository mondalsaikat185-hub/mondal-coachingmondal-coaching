import { DatabaseSync } from 'node:sqlite';
import { visibleIds, buildSide } from '../../src/lib/library-split.ts';

const db = new DatabaseSync('_dbcopy/r33_pilot.db');
const batchRows = db.prepare("SELECT data FROM rows WHERE sheet = 'batches'").all();
const batches = batchRows.map(r => JSON.parse(r.data));

const libRows = db.prepare("SELECT data FROM rows WHERE sheet = 'library'").all();
const library = libRows.map(r => JSON.parse(r.data));

const stuRow = db.prepare("SELECT data FROM rows WHERE sheet = 'users' AND json_extract(data, '$.phone') = '9999999901'").get();
const student = JSON.parse(stuRow.data);

const visible = visibleIds(library, batches, student.batchId);
const side = buildSide(library, visible, 'exam');
console.log('Exam folders:');
side.folders.forEach(f => {
  console.log(`  ID: ${f.id} | Parent: ${f.parentFolderId} | Title: ${f.title}`);
});

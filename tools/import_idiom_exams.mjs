// tools/import_idiom_exams.mjs
// Imports the 4 generated Idiom exams into SQLite and links them to the notes.
// Usage: node tools/import_idiom_exams.mjs [_dbcopy/mc2_snapshot.db] [--dry-run|--apply]

import { DatabaseSync } from 'node:sqlite';
import { existsSync, readFileSync } from 'node:fs';
import { argv } from 'node:process';

const args = argv.slice(2);
let dbPath = '_dbcopy/mc2_snapshot.db';
let isApply = false;

for (const arg of args) {
  if (arg === '--apply') isApply = true;
  else if (arg === '--dry-run') isApply = false;
  else if (!arg.startsWith('--')) dbPath = arg;
}

console.log('='.repeat(80));
console.log(`DATABASE: ${dbPath}`);
console.log(`MODE: ${isApply ? 'APPLY (Writing to database)' : 'DRY-RUN (No changes saved)'}`);
console.log('='.repeat(80));

const jsonPath = existsSync('generated_idiom_exams.json') ? 'generated_idiom_exams.json' : 'scratch/generated_idiom_exams.json';
const exams = JSON.parse(readFileSync(jsonPath, 'utf-8'));
console.log(`Loaded ${exams.length} exams from ${jsonPath} to import.`);

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA busy_timeout=10000;');

const countBefore = db.prepare("SELECT count(*) as count FROM rows").get().count;
const libraryCountBefore = db.prepare("SELECT count(*) as count FROM rows WHERE sheet='library'").get().count;

console.log(`Initial rows total: ${countBefore} (library: ${libraryCountBefore})`);

// Prepare verification of target notes
for (const ex of exams) {
  const noteRow = db.prepare("SELECT rk, id, data FROM rows WHERE sheet='library' AND id=?").get(ex.noteId);
  if (!noteRow) {
    throw new Error(`Target note not found in database: id=${ex.noteId}, range=${ex.range}`);
  }
  const noteData = JSON.parse(noteRow.data);
  console.log(`Found note for ${ex.range}: id=${noteData.id}, title=${noteData.title}, current linked: ${JSON.stringify(noteData.linkedExamIds || [])}`);
}

if (!isApply) {
  console.log('\nDRY-RUN completed successfully. Target notes verified. No changes made.');
  process.exit(0);
}

// Perform VACUUM backup before modifying if live
if (!dbPath.includes('snapshot')) {
  const ts = Date.now();
  const backupPath = `/data/mc2-pre-idioms-${ts}.db`;
  try {
    db.exec(`VACUUM INTO '${backupPath}'`);
    console.log(`✓ VACUUM live backup created at: ${backupPath}`);
  } catch (err) {
    console.warn(`VACUUM INTO failed (${err.message})`);
  }
}

db.exec('BEGIN IMMEDIATE;');
try {
  const insertStmt = db.prepare("INSERT INTO rows (sheet, id, data) VALUES ('library', ?, ?)");
  const updateStmt = db.prepare("UPDATE rows SET data = ? WHERE sheet = 'library' AND id = ?");

  for (const ex of exams) {
    const { noteId, range, ...examFields } = ex;
    
    // 1. Insert exam row
    insertStmt.run(ex.id, JSON.stringify(examFields));
    console.log(`✓ Inserted exam: ${ex.title} (id: ${ex.id})`);

    // 2. Update note row
    const noteRow = db.prepare("SELECT rk, id, data FROM rows WHERE sheet='library' AND id=?").get(noteId);
    const noteData = JSON.parse(noteRow.data);
    const existingLinks = Array.isArray(noteData.linkedExamIds) ? noteData.linkedExamIds : [];
    if (!existingLinks.includes(ex.id)) {
      existingLinks.push(ex.id);
    }
    noteData.linkedExamIds = existingLinks;
    noteData.noExamNeeded = false;
    updateStmt.run(JSON.stringify(noteData), noteId);
    console.log(`✓ Linked note ${range} (${noteId}) -> [${existingLinks.join(', ')}]`);
  }

  const countAfter = db.prepare("SELECT count(*) as count FROM rows").get().count;
  const libraryCountAfter = db.prepare("SELECT count(*) as count FROM rows WHERE sheet='library'").get().count;

  console.log(`\nRow counts: Before=${countBefore}, After=${countAfter} (diff: +${countAfter - countBefore})`);
  console.log(`Library counts: Before=${libraryCountBefore}, After=${libraryCountAfter} (diff: +${libraryCountAfter - libraryCountBefore})`);

  if (countAfter !== countBefore + exams.length) {
    throw new Error(`Row count mismatch! Expected +${exams.length}, got +${countAfter - countBefore}. Rolling back!`);
  }

  db.exec('COMMIT;');
  console.log('✓ Transaction committed successfully!');
} catch (err) {
  db.exec('ROLLBACK;');
  console.error('❌ Transaction rolled back due to error:', err);
  process.exit(1);
}

// Final verification of updated rows
console.log('\n--- Final Verification ---');
for (const ex of exams) {
  const exRow = db.prepare("SELECT rk, id, data FROM rows WHERE sheet='library' AND id=?").get(ex.id);
  const noteRow = db.prepare("SELECT rk, id, data FROM rows WHERE sheet='library' AND id=?").get(ex.noteId);
  const exData = JSON.parse(exRow.data);
  const noteData = JSON.parse(noteRow.data);
  console.log(`Verified exam: ${exData.title} in parent ${exData.parentId}`);
  console.log(`Verified note: ${noteData.title} has linkedExamIds: ${JSON.stringify(noteData.linkedExamIds)}`);
}

// tools/test_weekly_reset_dbcopy.mjs
// Verifies weekly reset logic on a DB copy (_dbcopy) without touching live database.

import fs from 'fs';
import path from 'path';
import os from 'os';
import { DatabaseSync } from 'node:sqlite';

const sourceDb = path.resolve('_dbcopy', 'mc2_snapshot.db');
if (!fs.existsSync(sourceDb)) {
  console.error('Source DB copy not found:', sourceDb);
  process.exit(1);
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mc2-reset-copy-'));
const testDbPath = path.join(tempDir, 'mc2.db');
fs.copyFileSync(sourceDb, testDbPath);

process.env.DATA_DIR = tempDir;
process.env.MC_SESSION_SECRET = 'testsecret';

// Load store and api using test DATA_DIR
const storeMod = await import('../vps-api-v2/store.js');
const S = storeMod.default || storeMod;
const apiMod = await import('../vps-api-v2/api.js');
const api = apiMod.default || apiMod;
const _internal = api._internal;

const tablesToCheck = ['examResults', 'examSessions', 'users', 'batches', 'library', 'notifications', 'attendance', 'payments'];

console.log('='.repeat(70));
console.log('TESTING WEEKLY RESET ON DB COPY (_dbcopy)');
console.log('='.repeat(70));

const countsBefore = S.counts();
console.log('\n--- ROW COUNTS BEFORE RESET ---');
for (const t of tablesToCheck) {
  console.log(`${t.padEnd(20)}: ${countsBefore[t] ?? 0}`);
}

console.log('\nExecuting runWeeklyReset on copy...');
const resetRes = _internal.runWeeklyReset(Date.now(), true);
console.log('Reset result:', JSON.stringify(resetRes, null, 2));

const countsAfter = S.counts();
console.log('\n--- ROW COUNTS AFTER RESET ---');
for (const t of tablesToCheck) {
  console.log(`${t.padEnd(20)}: ${countsAfter[t] ?? 0}`);
}

// Verification assertions
if ((countsAfter['examResults'] ?? 0) !== 0) {
  console.error('ERROR: examResults should be 0!');
  process.exit(1);
}

for (const t of ['users', 'batches', 'library', 'notifications', 'attendance', 'payments']) {
  if ((countsBefore[t] ?? 0) !== (countsAfter[t] ?? 0)) {
    console.error(`ERROR: Table ${t} count changed! Before=${countsBefore[t]}, After=${countsAfter[t]}`);
    process.exit(1);
  }
}

// Check backup & archive files
const backupFiles = fs.readdirSync(path.join(tempDir, 'backups')).filter(f => f.startsWith('weekly-pre-reset-'));
console.log('\nGenerated Backup Files:', backupFiles);
const archiveFiles = fs.readdirSync(path.join(tempDir, 'archive')).filter(f => f.startsWith('examResults-'));
console.log('Generated Archive Files:', archiveFiles);

if (backupFiles.length === 0 || archiveFiles.length === 0) {
  console.error('ERROR: Backup or archive file not generated!');
  process.exit(1);
}

console.log('\n' + '='.repeat(70));
console.log('ALL DB COPY WEEKLY RESET CHECKS PASSED 100%');
console.log('='.repeat(70));

// Cleanup temp dir safely (ignore Windows open file lock)
try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}

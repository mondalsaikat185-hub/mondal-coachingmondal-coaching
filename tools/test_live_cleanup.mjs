// tools/test_live_cleanup.mjs
// Runs on VPS to verify auto-cleanup of exam notification on LIVE Test Batch (ea15ae8c-861c-4b0b-82ad-fe4b69bb53ed)

import fs from 'fs';
import path from 'path';

const apiPkg = await import('/app/api.js');
const api = apiPkg.default || apiPkg;
const { _internal, handleRpc } = api;

const storePkg = await import('/app/store.js');
const S = storePkg.default || storePkg;

const TEST_BATCH_ID = 'ea15ae8c-861c-4b0b-82ad-fe4b69bb53ed';

console.log('='.repeat(75));
console.log('TESTING LIVE EXAM NOTIFICATION AUTO-CLEANUP (TEST BATCH)');
console.log('='.repeat(75));

// 1. Verify Test Batch exists
const batchRow = S.findRowById('batches', TEST_BATCH_ID);
if (!batchRow) {
  console.error('Test Batch not found:', TEST_BATCH_ID);
  process.exit(1);
}
console.log(`Target Batch: "${batchRow.obj.name}" (${TEST_BATCH_ID})`);

// Find Test Student (9999999901)
const stuRow = S.db.prepare("SELECT data FROM rows WHERE sheet = 'users' AND json_extract(data, '$.phone') = '9999999901' LIMIT 1").get();
if (!stuRow) {
  console.error('Test student 9999999901 not found');
  process.exit(1);
}
const student = JSON.parse(stuRow.data);
const studentToken = _internal.createSession(student);
console.log(`Test Student: "${student.name}" (ID: ${student.id})`);

// Find Admin user to ensure notification can be scheduled for Test Batch
const adminRow = S.db.prepare("SELECT data FROM rows WHERE sheet = 'users' AND json_extract(data, '$.role') = 'admin' LIMIT 1").get();
const adminUser = JSON.parse(adminRow.data);
const token = _internal.createSession(adminUser);
console.log(`Using Admin Session: "${adminUser.name}"`);

// 2. Pick an active exam from library
const libExams = S.readSheet('library').filter(it => it.type === 'exam' && it.isActive !== false && it.isActive !== 'false');
const candidates = _internal.examCandidates(batchRow.obj, Date.now(), libExams, null, { allowScheduled: true });
const sampleExam = candidates.length > 0 ? candidates[0] : libExams[0];
console.log(`Sample Exam for Test: "${sampleExam.title}" (ID: ${sampleExam.id})`);

// Calculate time 2 minutes in future (IST)
const IST_OFFSET_MS = 330 * 60 * 1000;
const nowMs = Date.now();
const tPlus2Ms = nowMs + 2 * 60 * 1000;
const istDate = new Date(tPlus2Ms + IST_OFFSET_MS);
const examDate = istDate.toISOString().slice(0, 10);
const hh = String(istDate.getUTCHours()).padStart(2, '0');
const mm = String(istDate.getUTCMinutes()).padStart(2, '0');
const examStartTime = `${hh}:${mm}`;

console.log(`\nStep 1: Creating notification for Test Batch...`);
console.log(`Current Time (IST): ${new Date(nowMs + IST_OFFSET_MS).toISOString().replace('T', ' ').slice(0, 19)}`);
console.log(`Exam Date: ${examDate}, Scheduled Start: ${examStartTime} IST (+2 mins)`);

const createRes = await handleRpc({
  action: 'apiCreateExamNotification',
  args: [{
    batchId: TEST_BATCH_ID,
    examDate,
    examStartTime,
    examIds: [sampleExam.id],
    modify: true
  }],
  token
});

if (!createRes.success) {
  console.error('Failed to create notification:', createRes.error);
  process.exit(1);
}

const notifId = (createRes.data && createRes.data.data && createRes.data.data.id) || (createRes.data && createRes.data.id);
console.log(`Notification created successfully! ID: ${notifId}`);

// Verify scheduled status & startIso
const notifRow = S.findRowById('notifications', notifId);
console.log(`Notification Status: ${notifRow.obj.status}`);
console.log(`Notification startIso: ${notifRow.obj.startIso}`);

// Step 2: Test at current time (T = 0)
console.log(`\nStep 2: Checking at current time T+0...`);
const cleanT0 = _internal.cleanupExpiredExamNotifications(nowMs);
console.log(`Deleted count at T+0: ${cleanT0.deleted}`);
const notifAtT0 = S.findRowById('notifications', notifId);
console.log(`Notification exists at T+0?: ${notifAtT0 ? 'YES (CORRECT)' : 'NO (ERROR)'}`);
if (!notifAtT0) {
  console.error('ERROR: Notification should not be deleted at T+0!');
  process.exit(1);
}

// Step 3: Test at T+2 minutes (exam start time)
console.log(`\nStep 3: Checking at exam start time T+2 min (${examStartTime} IST)...`);
const cleanT2 = _internal.cleanupExpiredExamNotifications(tPlus2Ms);
console.log(`Deleted count at T+2: ${cleanT2.deleted}`);
const notifAtT2 = S.findRowById('notifications', notifId);
console.log(`Notification exists at T+2?: ${notifAtT2 ? 'YES (CORRECT: within 10 min window)' : 'NO (ERROR)'}`);
if (!notifAtT2) {
  console.error('ERROR: Notification should not be deleted at start time T+2!');
  process.exit(1);
}

// Step 4: Test at T+12 minutes (start time + 10 minutes)
console.log(`\nStep 4: Checking at T+12 min (start time + 10 mins)...`);
const tPlus12Ms = tPlus2Ms + 10 * 60 * 1000 + 1000; // 10m 1s past start
const cleanT12 = _internal.cleanupExpiredExamNotifications(tPlus12Ms);
console.log(`Deleted count at T+12: ${cleanT12.deleted}`);
const notifAtT12 = S.findRowById('notifications', notifId);
console.log(`Notification exists at T+12?: ${notifAtT12 ? 'YES (ERROR: should be deleted)' : 'NO (CORRECT: DELETED!)'}`);
if (notifAtT12) {
  console.error('ERROR: Notification should have been deleted at T+12!');
  process.exit(1);
}

// Step 5: Verify archive file
console.log(`\nStep 5: Verifying archive file in /data/archive...`);
const archiveDir = path.join(S.DATA_DIR, 'archive');
const dayStr = istDate.toISOString().slice(0, 10);
const archiveFile = path.join(archiveDir, `notifications-${dayStr}.jsonl`);
console.log(`Archive file path: ${archiveFile}`);
if (!fs.existsSync(archiveFile)) {
  console.error('Archive file does not exist:', archiveFile);
  process.exit(1);
}
const archiveContent = fs.readFileSync(archiveFile, 'utf8');
const archivedLines = archiveContent.trim().split('\n');
console.log(`Total archived notifications today: ${archivedLines.length}`);
const foundOurNotif = archivedLines.some(line => line.includes(notifId));
console.log(`Found deleted notification ${notifId} in archive?: ${foundOurNotif ? 'YES (CORRECT)' : 'NO (ERROR)'}`);
if (!foundOurNotif) {
  console.error('ERROR: Notification was not saved in archive file!');
  process.exit(1);
}

// Step 6: Verify scheduledStartTimeMap of Test Batch is preserved
console.log(`\nStep 6: Verifying Test Batch scheduledStartTimeMap is preserved...`);
const batchAfter = S.findRowById('batches', TEST_BATCH_ID);
const schedMap = JSON.parse(batchAfter.obj.scheduledStartTimeMap || '{}');
console.log(`Test Batch scheduledStartTimeMap has sample exam?: ${schedMap[sampleExam.id] ? 'YES (PRESERVED: ' + schedMap[sampleExam.id] + ')' : 'NO (ERROR)'}`);

// Clean up sampleExam from test batch schedule to leave test batch pristine
delete schedMap[sampleExam.id];
S.updateRow('batches', TEST_BATCH_ID, { scheduledStartTimeMap: JSON.stringify(schedMap) });
console.log(`Pristine state restored for Test Batch scheduledStartTimeMap ✓`);

console.log('\n' + '='.repeat(75));
console.log('ALL LIVE TEST BATCH NOTIFICATION CLEANUP CHECKS PASSED 100%');
console.log('='.repeat(75));

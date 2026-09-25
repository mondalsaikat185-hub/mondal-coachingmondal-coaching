// Self-test: starts nothing; uses modules directly against a temp DB.
const os = require('os'), fs = require('fs'), path = require('path'), assert = require('assert');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mc2-'));
process.env.DATA_DIR = dir; process.env.MC_SESSION_SECRET = 'testsecret';
const S = require('../store');
const { handleRpc, _internal } = require('../api');
const PUB = 'MondalCoachingSecureToken2026!';
(async () => {
  const salt = 'abcd1234abcd1234';
  S.replaceSheets({
    users: [
      { id: 'admin1', name: 'Admin', phone: '9000000001', role: 'admin', status: 'active', salt, passcode: _internal.hashPasscode('adminpass', salt), batchId: '', tokenVersion: 1 },
      { id: 'stu1', name: 'Stu', phone: '9999999901', role: 'student', status: 'active', salt, passcode: _internal.hashPasscode('9999999901', salt), batchId: 'b1', monthlyFee: 500 },
    ],
    batches: [{ id: 'b1', name: 'TEST', assignedItemsMap: '{"lib1":"2026-01-01"}', scheduledStartTimeMap: '{}' }],
    library: [{ id: 'lib1', title: 'Exam 1', type: 'exam', isFolder: 'false', quizData: '{"q":[1,2]}' }],
    payments: [], notifications: [{ id: 'n1', title: 'hi', batchId: 'all' }], examSessions: [], examResults: [], attendance: [], sessions: [],
  }, { users: ['id','name','phone','email','role','status','batchId','passcode'] }, { announcement: 'hello', appSettings: '{"adminUpiId":"x@y","adminPayeeName":"M","enablePaymentSystem":true}' });

  const call = (action, args, token) => handleRpc({ action, args, token: token || PUB });
  let r = await call('apiLoginUser', ['9000000001', 'wrong']);
  assert.equal(r.success, false); assert.ok(r.remainingAttempts === 9);
  r = await call('apiLoginUser', ['9000000001', 'adminpass']);
  const adminTok = r.data.data.sessionToken; assert.ok(adminTok && !r.data.data.passcode);
  r = await call('apiLoginUser', ['9999999901', '9999999901']);
  const stuTok = r.data.data.sessionToken;

  r = await call('apiGetUsers', [], stuTok); assert.equal(r.code, 403);
  r = await call('apiGetUsers', [], adminTok); assert.equal(r.data.data.length, 2); assert.ok(!r.data.data[0].passcode);
  r = await call('apiGetUsers', [], 'garbage'); assert.equal(r.code, 401); assert.equal(r.forceLogout, true);

  r = await call('apiGetLibrary', [], stuTok); assert.equal(r.data.data[0].isFolder, false);
  r = await call('apiGetLibraryItemDetails', ['lib1'], stuTok); assert.equal(r.data.data.quizData, '{"q":[1,2]}');
  r = await call('apiGetBatches', [], stuTok); assert.equal(typeof r.data.data[0].assignedItemsMap, 'object');
  r = await call('apiGetAnnouncement', [], stuTok); assert.equal(r.data.data, 'hello');

  // payments
  r = await call('apiSubmitPaymentRequest', [{ month: 'September 2026', amount: 500, paymentMode: 'upi', transactionId: '123' }], stuTok); assert.equal(r.success, false);
  r = await call('apiSubmitPaymentRequest', [{ month: 'September 2026', amount: 500, paymentMode: 'upi', transactionId: '123456789012', proofImage: 'data:x' }], stuTok);
  assert.equal(r.success, true); const payId = r.data.data.id;
  r = await call('apiSubmitPaymentRequest', [{ month: 'October 2026', amount: 500, paymentMode: 'upi', transactionId: '123456789012' }], stuTok); assert.ok(/Duplicate/.test(r.error));
  r = await call('apiSubmitPaymentRequest', [{ month: 'December 2026', amount: 500, paymentMode: 'cash' }], stuTok); assert.ok(/October 2026/.test(r.error), r.error);
  r = await call('apiSubmitPaymentRequest', [{ month: 'October 2026, November 2026', amount: 1000, paymentMode: 'cash' }], stuTok); assert.equal(r.success, true);
  r = await call('apiGetPayments', [], stuTok); assert.equal(r.data.data.length, 2); assert.equal(r.data.data[0].proofImage, ''); assert.equal(r.data.data[0].hasProof, true);
  r = await call('apiGetPaymentProof', [payId], stuTok); assert.equal(r.data.data.proofImage, 'data:x');
  r = await call('apiUpdatePaymentStatus', [payId, 'rejected', ''], adminTok); assert.ok(/mandatory/.test(r.error));
  r = await call('apiUpdatePaymentStatus', [payId, 'approved', ''], adminTok); assert.equal(r.data.data.status, 'approved');
  r = await call('apiGetMyProfile', [], stuTok); assert.equal(r.data.data.paymentStatus, 'paid');

  // notifications
  r = await call('apiCreateNotification', [{ title: 'from stu', message: 'x', batchId: 'admin' }], stuTok); const nid = r.data.data.id;
  r = await call('apiGetNotifications', [], adminTok); assert.equal(r.data.data.length, 2);
  r = await call('apiDeleteNotification', ['n1'], stuTok); assert.equal(r.code, 403);
  r = await call('apiDeleteNotification', [nid], stuTok); assert.equal(r.success, true);

  // exams
  r = await call('apiSubmitExamResult', [{ id: 'res1', examId: 'lib1', score: 5, studentId: 'hacker' }], stuTok); assert.equal(r.data.data.studentId, 'stu1');
  r = await call('apiSubmitExamResult', [{ id: 'res1', examId: 'lib1', score: 5 }], stuTok); assert.equal(r.data.duplicate, true);
  r = await call('apiHasSubmitted', ['lib1', 'x'], stuTok); assert.equal(r.data.submitted, true);
  r = await call('apiDeleteMultipleExamResults', [['res1']], adminTok); assert.equal(r.data.count, 1);

  // library delete cleans batches
  r = await call('apiDeleteMultipleLibraryItems', [['lib1']], adminTok); assert.equal(r.data.count, 1);
  r = await call('apiGetBatches', [], adminTok); assert.deepEqual(r.data.data[0].assignedItemsMap, {});

  // passcode change revokes sessions
  r = await call('apiChangePasscode', ['stu1', '9999999901', 'newpass1'], stuTok); assert.equal(r.success, true);
  r = await call('apiGetMyProfile', [], stuTok); assert.equal(r.code, 401);
  r = await call('apiLoginUser', ['9999999901', 'newpass1']); assert.equal(r.data.success, true);

  // ---------- exam notifications (Add Notification for Exam) ----------
  {
    const I = _internal;
    assert.deepEqual(I.resolveBatchSlot({ name: 'Shonibar Sakal' }), { classDay: '6', examStartTime: '09:05' });
    assert.deepEqual(I.resolveBatchSlot({ name: 'Shonibar Bikal' }), { classDay: '6', examStartTime: '14:05' });
    assert.deepEqual(I.resolveBatchSlot({ name: 'Sunday Morning' }), { classDay: '0', examStartTime: '08:05' });
    assert.deepEqual(I.resolveBatchSlot({ name: 'Sunday Bikal' }), { classDay: '0', examStartTime: '14:05' });
    assert.deepEqual(I.resolveBatchSlot({ name: 'Shonibar Sakal', classDay: '0', examStartTime: '10:30' }), { classDay: '0', examStartTime: '10:30' });
    assert.deepEqual(I.resolveBatchSlot({ name: 'Test Batch' }), { classDay: '', examStartTime: '' });
    assert.equal(I.nextClassDate('6', Date.parse('2026-09-25T06:00:00Z')), '2026-09-26'); // Friday -> tomorrow
    assert.equal(I.nextClassDate('6', Date.parse('2026-09-25T19:00:00Z')), '2026-10-03'); // Sat 00:30 IST -> next week
    assert.equal(I.nextClassDate('0', Date.parse('2026-09-26T04:30:00Z')), '2026-09-27');
    assert.equal(I.examStartIso('2026-10-03', '09:05'), '2026-10-03T03:35:00.000Z');

    const day1 = new Date(Date.now() - 86400000).toISOString();
    S.saveRow('library', { id: 'f1', title: 'Bio', type: 'folder', isFolder: 'true' });
    S.saveRow('library', { id: 'note1', title: 'জীববিদ্যা: হরমোন (Hormones)', type: 'note', parentId: 'f1' });
    S.saveRow('library', { id: 'ex1', title: 'জীববিদ্যা: হরমোন  (Hormones) - Mock', type: 'exam', parentId: 'gk-bio' });
    S.saveRow('library', { id: 'exOther', title: 'Unrelated exam', type: 'exam', parentId: 'f1' });
    S.saveRow('library', { id: 'p1', title: 'Passage 1', type: 'exam' }); S.saveRow('library', { id: 'p2', title: 'Passage 2', type: 'exam' });
    S.saveRow('library', { id: 'c1', title: 'Cloze Test 1', type: 'exam' }); S.saveRow('library', { id: 'c2', title: 'Cloze Test 2', type: 'exam' });
    S.saveRow('library', { id: 'j1', title: 'Para Jumbles 1', type: 'exam' });
    S.saveRow('library', { id: 'ex2', title: 'Direct exam', type: 'exam', parentId: 'f9' });
    S.saveRow('library', { id: 'ex3', title: 'Old scheduled', type: 'exam', parentId: 'f1' });
    S.saveRow('batches', { id: 'B2x', name: 'Shonibar Sakal', assignedItemsMap: { note1: day1, ex2: day1, ex3: day1, p1: day1 }, scheduledStartTimeMap: { ex3: '2026-01-01T00:00:00.000Z' } });
    S.saveRow('batches', { id: 'b3', name: 'Sunday Morning', assignedItemsMap: {}, scheduledStartTimeMap: {} });
    S.updateRow('users', 'stu1', { batchId: 'b1, B2x' });
    r = await call('apiLoginUser', ['9999999901', 'newpass1']); const st2 = r.data.data.sessionToken;
    r = await call('apiLoginUser', ['9000000001', 'adminpass']); const ad2 = r.data.data.sessionToken;

    r = await call('apiGetExamRequestOptions', ['B2x', ''], st2);
    assert.equal(r.success, true, r.error);
    assert.deepEqual(r.data.data.exams.map(x => x.id).sort(), ['ex1', 'ex2']);
    assert.deepEqual(r.data.data.series.map(x => x.id), ['p2', 'c1', 'j1']);
    const D = r.data.data.defaultDate; assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(D)); assert.equal(new Date(D + 'T00:00:00Z').getUTCDay(), 6);
    assert.equal(r.data.data.examStartTime, '09:05'); assert.equal(r.data.data.existing, null);
    r = await call('apiGetExamRequestOptions', ['b3', ''], st2); assert.equal(r.code, 403);
    r = await call('apiCreateExamNotification', [{ batchId: 'b3', examDate: D, examIds: ['ex1'] }], st2); assert.equal(r.code, 403);
    r = await call('apiCreateExamNotification', [{ batchId: 'B2x', examDate: D, examIds: ['ex3'] }], st2); assert.equal(r.success, false);
    r = await call('apiCreateExamNotification', [{ batchId: 'B2x', examDate: '2020-01-01', examIds: ['ex1'] }], st2); assert.equal(r.success, false);
    r = await call('apiCreateExamNotification', [{ batchId: 'B2x', examDate: '2026-02-31', examIds: ['ex1'] }], st2); assert.equal(r.success, false);
    r = await call('apiCreateExamNotification', [{ batchId: 'B2x', examDate: D, examIds: ['exOther'] }], st2); assert.equal(r.success, false);
    r = await call('apiCreateExamNotification', [{ batchId: 'B2x', examDate: D, examIds: ['ex1', 'ex2'] }], st2);
    assert.equal(r.success, true, r.error); assert.equal(r.data.duplicate, false);
    const reqId = r.data.data.id; assert.equal(r.data.data.status, 'scheduled');
    assert.deepEqual(JSON.parse(r.data.data.examIds), ['p2', 'c1', 'j1', 'ex1', 'ex2']);
    const start = I.examStartIso(D, '09:05');
    r = await call('apiGetBatches', [], ad2);
    let bb = r.data.data.find(b => b.id === 'B2x');
    assert.equal(bb.scheduledStartTimeMap.ex1, start); assert.equal(bb.scheduledStartTimeMap.ex2, start);
    assert.ok(bb.assignedItemsMap.ex1); assert.equal(bb.scheduledStartTimeMap.ex3, '2026-01-01T00:00:00.000Z');
    assert.deepEqual(bb.examSlot, { classDay: '6', examStartTime: '09:05' });
    r = await call('apiGetExamRequestOptions', ['B2x', D], st2); assert.equal(r.data.data.exams.length, 0); assert.equal(r.data.data.existing.id, reqId);
    assert.deepEqual(r.data.data.series.map(x => x.id), ['c2']); // Passage 3 / Para Jumbles 2 not in library yet
    r = await call('apiCreateExamNotification', [{ batchId: 'B2x', examDate: D, examIds: ['ex1'] }], ad2);
    assert.equal(r.data.duplicate, true); assert.equal(r.data.data.status, 'duplicate'); const dupId = r.data.data.id;

    // student sees batch notification (mixed-case batch id), mark-as-read does not duplicate rows
    r = await call('apiGetNotifications', [], st2); assert.ok(r.data.data.some(n => n.id === reqId));
    const nBefore = S.counts().notifications;
    r = await call('apiCreateNotification', [{ id: reqId, readers: ['stu1'] }], st2); assert.equal(r.success, true);
    assert.equal(S.counts().notifications, nBefore);
    assert.ok(JSON.parse(S.findRowById('notifications', reqId).obj.readers).includes('stu1'));
    assert.equal(S.findRowById('notifications', reqId).obj.type, 'exam_request');
    r = await call('apiDeleteNotification', [reqId], st2); assert.equal(r.code, 403);
    r = await call('apiCreateNotification', [{ id: reqId, title: 'Edited', type: 'admin_to_batch' }], ad2);
    assert.equal(S.counts().notifications, nBefore);
    assert.equal(S.findRowById('notifications', reqId).obj.type, 'exam_request'); assert.equal(S.findRowById('notifications', reqId).obj.title, 'Edited');

    // admin delete before exam opens -> schedule undone, added share removed, old share kept
    r = await call('apiDeleteNotification', [reqId], ad2); assert.equal(r.success, true);
    r = await call('apiDeleteNotification', [dupId], ad2); assert.equal(r.success, true);
    r = await call('apiGetBatches', [], ad2); bb = r.data.data.find(b => b.id === 'B2x');
    assert.equal(bb.scheduledStartTimeMap.ex1, undefined); assert.equal(bb.assignedItemsMap.ex1, undefined);
    assert.equal(bb.scheduledStartTimeMap.ex2, undefined); assert.ok(bb.assignedItemsMap.ex2);

    // background scheduler picks up pending rows; bad batch -> error, not crash
    S.saveRow('notifications', { type: 'exam_request', batchId: 'B2x', examDate: D, examIds: '["ex2"]', status: 'pending' });
    S.saveRow('notifications', { type: 'exam_request', batchId: 'nope', examDate: D, examIds: '["ex2"]', status: 'pending' });
    const res = S.tx(() => I.runExamScheduler(Date.now())); assert.deepEqual(res, { done: 1, failed: 1 });
    assert.equal(JSON.parse(S.findRowById('batches', 'B2x').obj.scheduledStartTimeMap).ex2, start);
    console.log('exam notification tests OK');
  }

  // ---------- profile photo, register whitelist, last-exam summary, delete cleanup ----------
  {
    const small = 'data:image/webp;base64,' + 'A'.repeat(2000);
    r = await call('apiLoginUser', ['9999999901', 'newpass1']); const st3 = r.data.data.sessionToken;
    r = await call('apiSaveUser', [{ id: 'stu1', profilePhotoUrl: small, phone: '1111111111', role: 'admin', monthlyFee: 1 }], st3);
    assert.equal(r.success, true, r.error);
    let u = S.findRowById('users', 'stu1').obj;
    assert.equal(u.profilePhotoUrl, small); assert.equal(u.role, 'student'); assert.equal(u.phone, '9999999901');
    r = await call('apiSaveUser', [{ id: 'stu1', profilePhotoUrl: 'data:image/webp;base64,' + 'A'.repeat(250000) }], st3); assert.equal(r.success, false);
    r = await call('apiSaveUser', [{ id: 'stu1', profilePhotoUrl: 'javascript:alert(1)' }], st3); assert.equal(r.success, false);
    assert.equal(S.findRowById('users', 'stu1').obj.profilePhotoUrl, small);
    r = await call('apiRegisterUser', [{ name: 'New', phone: '9876500001', batchId: 'b1', role: 'admin', status: 'active', monthlyFee: 0, profilePhotoUrl: small }]);
    assert.equal(r.success, true, r.error);
    const nu = S.readSheet('users').find(x => x.phone === '9876500001');
    assert.equal(nu.role, 'student'); assert.equal(nu.status, 'pending'); assert.equal(Number(nu.monthlyFee), 500); assert.equal(nu.profilePhotoUrl, small);
    S.saveRow('library', { id: 'exL', title: 'Last exam title', type: 'exam' });
    r = await call('apiSubmitExamResult', [{ id: 'resL', examId: 'exL', score: 7, totalQuestions: 10, correctAnswers: 8, wrongAnswers: 2, skippedAnswers: 0, submittedAt: '2026-09-26T04:00:00.000Z' }], st3);
    assert.equal(r.success, true);
    const le = JSON.parse(S.findRowById('users', 'stu1').obj.lastExam);
    assert.equal(le.title, 'Last exam title'); assert.equal(le.correct, 8);
    r = await call('apiGetMyProfile', [], st3); assert.ok(r.data.data.lastExam);
    S.saveRow('notifications', { id: 'msgNew', senderId: nu.id, type: 'student_to_admin', title: 'hi' });
    r = await call('apiLoginUser', ['9000000001', 'adminpass']); const ad3 = r.data.data.sessionToken;
    r = await call('apiDeleteUser', [nu.id], ad3); assert.equal(r.success, true);
    assert.equal(S.findRowById('users', nu.id), null); assert.equal(S.findRowById('notifications', 'msgNew'), null);
    r = await call('apiGetPublicBatches', []);
    assert.equal(r.success, true); assert.ok(r.data.data.length >= 1); assert.equal(r.data.data[0].assignedItemsMap, undefined);
    assert.ok(r.data.data.every(b => !/test/i.test(b.name)));
    r = await call('apiRegisterUser', [{ name: 'Bad', phone: '9876500002', batchId: 'nope' }]); assert.equal(r.success, false);
    r = await call('apiRegisterUser', [{ name: 'Two', phone: '9876500003', batchId: 'b3, B2x' }]); assert.equal(r.success, true, r.error);
    // batch delete removes its only-batch students (with photos) and the batch's notifications
    S.saveRow('batches', { id: 'bDel', name: 'Delete Me', assignedItemsMap: {}, scheduledStartTimeMap: {} });
    S.saveRow('users', { id: 'uDel', name: 'Gone', phone: '9876500009', role: 'student', status: 'active', batchId: 'bDel', profilePhotoUrl: small });
    S.saveRow('notifications', { id: 'nDel', batchId: 'bDel', type: 'exam_request' });
    r = await call('apiDeleteBatch', ['bDel'], ad3); assert.equal(r.success, true);
    assert.equal(S.findRowById('users', 'uDel'), null); assert.equal(S.findRowById('notifications', 'nDel'), null);
    console.log('profile photo / register / last exam tests OK');
  }

  // ---------- full new-student journey: join -> pending -> admin approves -> login works ----------
  {
    r = await call('apiLoginUser', ['9000000001', 'adminpass']); const adm = r.data.data.sessionToken;
    r = await call('apiGetPublicBatches', []); const bId = r.data.data[0].id;
    r = await call('apiRegisterUser', [{ name: 'Journey Kid', phone: '9876512345', batchId: bId }]); assert.equal(r.success, true, r.error);
    r = await call('apiRegisterUser', [{ name: 'Journey Kid', phone: '+91 98765 12345', batchId: bId }]); assert.equal(r.data.status, 'pending'); // same phone again -> tells status, no duplicate
    assert.equal(S.readSheet('users').filter(u => u.phone === '9876512345').length, 1);
    r = await call('apiCheckApplicationStatus', ['98765-12345']); assert.equal(r.data.status || r.status, 'pending');
    r = await call('apiLoginUser', ['9876512345', 'wrong']); assert.equal(r.success, false);
    r = await call('apiLoginUser', ['+91 98765 12345', '9876512345']); assert.equal(r.success, true, r.error);
    let kid = r.data.data.sessionToken; const kidId = r.data.data.id;
    assert.equal(r.data.data.status, 'pending'); assert.ok(!r.data.data.passcode && !r.data.data.salt);
    r = await call('apiGetLibrary', [], kid); assert.equal(r.code, 403); assert.equal(r.notApproved, true);
    r = await call('apiGetMyProfile', [], kid); assert.equal(r.success, true);
    r = await call('apiCreateNotification', [{ title: 'Please approve', message: 'hi', batchId: 'all' }], kid);
    assert.equal(S.findRowById('notifications', r.data.data.id).obj.batchId, 'admin');
    r = await call('apiUpdateUserStatus', [kidId, 'active', ''], adm); assert.equal(r.success, true);
    r = await call('apiLoginUser', ['9876512345', '9876512345']); kid = r.data.data.sessionToken; assert.equal(r.data.data.status, 'active');
    r = await call('apiGetLibrary', [], kid); assert.equal(r.success, true);
    // rejected student can re-apply (status back to pending) but cannot touch fees/role
    r = await call('apiUpdateUserStatus', [kidId, 'rejected', 'wrong batch'], adm);
    r = await call('apiGetLibrary', [], kid); assert.equal(r.code, 401); // status change logs the old session out
    r = await call('apiLoginUser', ['9876512345', '9876512345']); kid = r.data.data.sessionToken; assert.equal(r.data.data.status, 'rejected');
    r = await call('apiGetLibrary', [], kid); assert.equal(r.code, 403);
    r = await call('apiSaveUser', [{ id: kidId, name: 'Journey Kid', status: 'pending', batchId: bId, monthlyFee: 0, role: 'admin' }], kid); assert.equal(r.success, true, r.error);
    let row = S.findRowById('users', kidId).obj; assert.equal(row.status, 'pending'); assert.equal(row.role, 'student'); assert.equal(Number(row.monthlyFee), 500);
    r = await call('apiSaveUser', [{ id: kidId, status: 'active' }], kid); assert.equal(S.findRowById('users', kidId).obj.status, 'pending'); // cannot self-approve
    console.log('new student journey tests OK');
  }

  // transaction rollback: failing write leaves no partial data
  const before = S.counts();
  try { S.tx(() => { S.saveRow('payments', { x: 1 }); throw new Error('boom'); }); } catch (e) {}
  assert.deepEqual(S.counts(), before);

  // speed
  for (let i = 0; i < 2000; i++) S.saveRow('examResults', { examId: 'e' + (i % 50), studentId: 's' + (i % 90), answersJSON: 'x'.repeat(2000) });
  let t = Date.now(); for (let i = 0; i < 20; i++) await call('apiGetExamResults', [], adminTok);
  console.log('apiGetExamResults avg ms (2000 rows):', (Date.now() - t) / 20);
  t = Date.now(); for (let i = 0; i < 50; i++) await call('apiLoginUser', ['9000000001', 'adminpass']);
  console.log('apiLoginUser avg ms:', (Date.now() - t) / 50);
  console.log('ALL TESTS PASSED');
})().catch(e => { console.error('TEST FAILED', e); process.exit(1); });

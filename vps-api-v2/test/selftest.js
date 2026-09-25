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

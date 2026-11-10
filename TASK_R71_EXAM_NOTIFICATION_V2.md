# TASK R71 — Exam Notification v2 (student exam picking, edit, admin-only delete, 1-hour auto-delete). Code change + tests. NO deploy.
Read the whole file first. Work to the end without asking. Follow AGENTS.md. Keep each change small; do not rewrite working code.
Files involved:
- backend: `vps-api-v2/api.js`, `vps-api-v2/batch-schedule.js`, `vps-api-v2/test/selftest.js`
- frontend: `src/components/ExamNotificationForm.tsx`, `src/components/NotificationsPanel.tsx`, `src/lib/api.ts`

## What Saikat wants (his words, summarised by Claude)
1. When a student posts "Add Notification for Exam", they must be able to choose **any** exam in the app, not only the homework ones.
   - The homework-related exams (today's logic in `examCandidates`) stay on top as suggestions.
   - Exclude banking exams, SLST and inactive exams.
2. The student picks the **date and time**, and can **edit** their own exam notification until the exam start time. After that, no edit is allowed.
3. **Only the admin can delete** any notification. Students cannot delete anything, not even their own messages.
4. The admin can edit any notification. This already exists; keep it working.
5. **Auto-delete:** 60 minutes after a batch's tuition start time on its class day, delete **all notifications of that batch**. This replaces today's "10 minutes after exam start" rule. Keep the archive-before-delete step.
6. A student can still send a plain message to the admin (no exam). This already exists; keep it.
7. Sunday Morning stays at **08:05** (`batch-schedule.js` already says so). Do not change the batch times.

## Part A — backend (`api.js`)
1. **`apiGetExamRequestOptions`**: add a field `allExams` to the returned `data`.
   - Each entry is `{id, title, folderPath, subject}` for every library item that has `quizData`, has `isActive` not equal to false/"false", and has a path that starts with `STUDENT'S EXAM` or `Math's Sheet`.
   - Skip any item whose path or title matches `/bank|banking|ibps|sbi|rbi|slst/i`.
   - `subject` = the second path part (Math, English, GK, Reasoning, …).
   - Sort by subject, then path, then title.
   - Cache it in the existing `memCache` for 5 minutes.
   - Keep `exams` (the homework suggestions) exactly as today.
2. **`apiCreateExamNotification`**: accept exam ids from `allExams` too.
   - Validate that every id is a real exam (has `quizData`). Reject unknown ids with a clear Bengali error.
   - The scheduler must give the batch access to **every** chosen exam, the way it does today for homework exams (`assignedItemsMap` plus `scheduledStartTimeMap` plus `addedAssign`).
   - Write a selftest that proves an exam NOT shared to the batch before becomes shared and locked until the start time.
3. **New `apiUpdateExamNotification(req, session)`**, with `req` = `{id, examDate, examStartTime, examIds}`.
   - Allowed for the sender (a student) or the admin.
   - A student may edit only their own notification, and only while `now < start time`. Otherwise return Bengali error 403 "পরীক্ষা শুরু হয়ে গেছে — আর বদলানো যাবে না".
   - Implementation:
     - call `undoExamRequest(old)` first, so access that only this request added is removed;
     - then save the new values with `status: 'pending'`;
     - then run the same scheduling function the create path uses.

     All of this must happen inside ONE `S.tx`.
   - Register the new action in USER_ACTIONS, ACTIONS_NEEDING_SESSION and exports. It is NOT READ_ONLY.
4. **`apiDeleteNotification`**: if `session.role !== 'admin'`, always return 403 "শুধু Admin notification মুছতে পারেন". Keep the admin path, including `undoExamRequest`, unchanged.
5. **`apiCreateNotification`**:
   - A student's plain message must store the student's own batch id in a new field `ownerBatchId`. Keep `batchId:'admin'`, so it still goes only to the admin.
   - Students still may only mark messages as read.
6. **Replace `cleanupExpiredExamNotifications` with `cleanupBatchNotifications(nowMs)`.**
   - For each batch, use `resolveBatchSlot` to get the class day and start time.
   - If today in IST is the class day and `now >= today's start + 60 min`, delete every notification whose `batchId` or `ownerBatchId` equals that batch id. This covers exam requests, admin-to-batch notifications and students' plain messages.
   - For exam requests, use their own `startIso` if they have one: delete at `startIso + 60 min`.
   - Never delete notifications with `batchId 'all'` or of type `admin_alert`.
   - Archive each deleted row first. Use the same archive file as today.
   - Wire it in where the old function was called (the 1-minute tick). Keep the old name as an alias, so nothing else breaks.
   - Deleting a notification must NOT remove the exam from the batch and must NOT unlock or relock it. Exam access stays as scheduled. Do NOT call `undoExamRequest` here.
7. **Do NOT touch `examResults`.** Results are never deleted by this task.

## Part B — frontend
1. **`ExamNotificationForm.tsx`**
   - Keep the date field (DD/MM/YYYY) and the time field. Students can change both.
   - Show the homework suggestions first (today's list). Below them, add a section **"সব পরীক্ষা থেকে বেছে নিন"** with:
     - a search box (title search, Bengali or English);
     - a subject filter (chips);
     - a checkbox list from `allExams`.

     Show at most 50 rows at a time, so phones stay fast.
   - Already-selected exams show as removable chips.
   - **Edit mode:** if the form opens with an existing notification that the current user may edit (sender, before start; or admin), prefill it and call `api.updateExamNotification`.
2. **`NotificationsPanel.tsx`**
   - Show the delete button ONLY for the admin.
   - Show an **"Edit"** button on an exam notification for:
     - its sender, before its start time;
     - the admin, always.

     Edit opens the form in edit mode.
   - The admin's existing edit of plain notifications stays as it is.
3. **`api.ts`**: add `updateExamNotification(req)`.

## Part C — tests (must all pass)
Add these to `vps-api-v2/test/selftest.js`, using an in-memory or temp DB like the existing tests:
1. `allExams` has more than 1000 entries on a copy of `_dbcopy/r70u_live.db`, includes Math, English, GK and Reasoning, and contains no title matching bank/slst.
2. A student creates a request with one homework exam and one non-homework exam. After scheduling, both are in the batch's `assignedItemsMap`, and `scheduledStartTimeMap` equals the start time.
3. The student edits the request before the start: the removed exam's access that this request added is gone; the new exam is scheduled.
4. The student edits after the start: 403.
5. A student deletes their own plain message: 403. The admin deletes it: OK.
6. `cleanupBatchNotifications`:
   - at start + 59 min: nothing deleted;
   - at start + 61 min: all of that batch's notifications are deleted, including a student plain message with `ownerBatchId`;
   - another batch's notifications and `batchId:'all'` notifications stay;
   - the exam stays in `assignedItemsMap` and `scheduledStartTimeMap`;
   - the `examResults` row count is unchanged.

Run `node vps-api-v2/test/selftest.js` and `npm run build` (frontend). Both must pass.

## Part D — one data fix (prepare only, do not apply)
The Sunday Morning mixed test `d6134b42-dc5e-41a1-8019-ef3325aaf9ad` is locked until 09:05. Saikat says Sunday Morning starts at **08:05**.
- Write `tools/r71/r71_fix_time.py <db>`. It sets that exam's entry in the Sunday Morning batch's `scheduledStartTimeMap` to `2026-11-15T02:35:00.000Z` and changes nothing else.
- Keep the map's string/dict type.
- Test it on a copy of `_dbcopy/r70u_live.db`.

## STOP — no deploy
Write `R71_SUMMARY.md`, at most 30 lines:
- the list of changed files;
- the test output, pasted exactly;
- the build result;
- the full `git diff --stat`.

Do NOT deploy the backend or the frontend, and do NOT write to live. Claude reviews the diff first.

# TASK R72 — Two small fixes in the exam notification form. PRE-APPROVED DEPLOY (frontend + backend). Do it now.
Follow AGENTS.md. Do not change anything else.

## Claude found these on the live form (`verify71/form.png`)
1. **The time box is empty.** The form shows "--:-- --".
   - The form must pre-fill it from `opts.examStartTime`, the batch's time (Sunday Morning = 08:05), whenever the form opens for a new request and the time is still empty.
   - In edit mode, keep the notification's own time.
2. **The exam list sorts as text.** It shows "Cloze Test 1, 10, 100, 11…".
   - Sort `allExams` with natural number order, so it reads "1, 2, 3 … 10, 11 … 100".
   - Use `a.title.localeCompare(b.title, undefined, {numeric: true})` in `getAllExamsList` for both `folderPath` and `title`.
   - Clear the `all_exams_v2` cache key on deploy, so the old order goes away.

## Steps
1. Make both fixes.
2. Add one selftest: `allExams` has "Cloze Test 2" before "Cloze Test 10".
3. `node vps-api-v2/test/selftest.js` must print `ALL TESTS PASSED`, and `npm run build` must pass.
4. Back up the live `api.js` as `api.js.pre_r72`.
5. Deploy the backend (then check `/health` returns 200) and the frontend (Vercel Ready), the usual way.
6. On a Pixel 5 emulation, open the form as a test student, read-only. The time must show 08:05 for Sunday Morning, and the list must be in natural order. Save `verify72/form.png`.
7. Write `R72_REPORT.md`, at most 6 lines.

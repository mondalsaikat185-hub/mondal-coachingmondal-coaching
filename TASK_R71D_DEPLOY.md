# TASK R71D — Deploy Exam Notification v2 + fix the Sunday test time. PRE-APPROVED LIVE DEPLOY. Do it now, do not stop to ask.
Follow AGENTS.md (the normal backend VPS deploy and the Vercel frontend deploy, exactly as done before). Use `ssh -n`.

## Claude's review of R71
- Claude read the full diff and re-ran `selftest.js`: ALL TESTS PASSED.
- Write actions run inside `S.tx`, so the edit is atomic.
- The delete button and the edit rules are correct.

Two changes before deploy:
1. **One small backend fix** in `apiUpdateExamNotification`, for students only. After computing the new `examDate` and `examStartTime`, reject the edit if `new Date(examStartIso(examDate, examStartTime)).getTime() <= Date.now()`, with the Bengali error "এই সময় পেরিয়ে গেছে — ভবিষ্যতের সময় দিন". Admins are not limited. Add one selftest for it.
2. **Replace `tools/r71/r71_fix_time.py`** with Claude's version (already saved in that path). Your version matched batches with `LIKE '%Sunday Morning%'`, which could touch other batches.

Do NOT commit or deploy `tools/r40/audit_r39.py`. It has an old unrelated change; leave it as it is.

## Steps
1. Make fix 1. Run `node vps-api-v2/test/selftest.js` (must print `ALL TESTS PASSED`) and `npm run build` (must pass).
2. **Back up.**
   - Take a fresh live `VACUUM INTO backups/mc2_pre_r71d_<ts>.db`.
   - Copy it to `/data/backup/` and to local `_dbcopy/`.
   - Also keep a copy of the current live `api.js` and `batch-schedule.js` on the VPS, as `api.js.pre_r71d`.
3. **Deploy the backend.** Deploy `vps-api-v2/api.js` (plus any other changed backend file) to mc-api-v2 the usual way. Restart, then check `/health` returns 200.
4. **Deploy the frontend.** Deploy to Vercel the usual way and confirm the new deployment is Ready.
5. **Apply the time fix.**
   - Run `python -X utf8 tools/r71/r71_fix_time.py` on a pulled copy first. It must print `R71 fix applied`.
   - Then apply the same single-row change on live in ONE transaction, after checking that the live batch row equals the pulled `before` row.
   - Restart, then check `/health`.
6. **Verify live (read-only).**
   - Pull `_dbcopy/r71d_live.db`. `claude_audit` must be CLEAN.
   - The Sunday Morning map must show the test at `2026-11-15T02:35:00.000Z`.
   - With a Pixel 5 emulation, log in as admin preview or a test student. Open the notifications panel.
   - The "Add Notification for Exam" form must show the section "সব পরীক্ষা থেকে বেছে নিন" with search.
   - Do NOT post anything.
   - Save `verify71/form.png`.
   - If anything is broken, roll back both the code and the DB from the backups, then report.
7. **Report.** Write `R71D_REPORT.md`, at most 10 lines.

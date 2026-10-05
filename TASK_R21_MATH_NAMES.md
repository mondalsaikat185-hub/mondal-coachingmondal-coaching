# R21 — Math sheet/exam matching by clean names (written & audited by Claude). Follow EXACTLY.

## Goal
Make every Math sheet and its exam carry a clean, matching name so sharing a sheet auto-shows its exam.
Claude already verified on a data copy that this works. Do NOT change the logic below.

## Part 1 — DATA rename (Math only). Reversible, backed up.
Run the ready-made script INSIDE the mc-api-v2 container against the LIVE db:
1. `scp tools/rename_math.mjs vps:/tmp/rename_math.mjs`
2. `ssh vps "cd /root/smartqueue-stack && docker compose cp /tmp/rename_math.mjs mc-api-v2:/tmp/rename_math.mjs && docker compose exec -T mc-api-v2 node /tmp/rename_math.mjs /data/mc2.db"`
   - It prints a BACKUP path (keep it), every old->new title, and "Row count X -> X (must be equal)".
   - If row count differs or it ROLLBACKs, STOP and report — change nothing else.
3. Paste the FULL output into R21_REPORT.md.
Result: Math notes become "<Topic> — English/Bengali Sheet"; exams become "<Topic> — Set 1/2".
Do NOT rename anything outside "Math's Sheet". Do NOT touch any other sheet/exam/data.

## Part 2 — CODE: widen the matcher so these names match (vps-api-v2/api.js, ONE line)
In `function normTitle` (around line 1054) change ONLY the first replace:
FROM: `.replace(/\b(from|to|set|part|mock|test)\b/gi, ' ')`
TO:   `.replace(/\b(from|to|set|part|mock|test|exam|sheet|english|bengali|mcqs?|level|easy|moderate|high)\b/gi, ' ')`
Nothing else in that file.

## Part 3 — CODE: "Math Exam" label on the Exams side (frontend, display only)
In the Exams pages (src/pages/StudentExams.tsx AND src/pages/AdminExams.tsx), when a folder's title is exactly `Math's Sheet`, DISPLAY it as `Math Exam` (label only — do NOT change the stored title or folder id). A one-line display alias where the folder name is rendered. Nothing else.

## Verify (write all raw output to R21_REPORT.md)
A. After Part 1, refresh the read-only copy: newest `/data/backups/hourly-*.db` -> `_dbcopy/mc2_snapshot.db` (as in earlier rounds).
B. `python tools/note_exam_coverage.py _dbcopy/mc2_snapshot.db missing` — the "Math's Sheet" section must now show title-matched exams (not 0). Paste that section.
C. `cd vps-api-v2 && node test/selftest.js` -> ALL TESTS PASSED. Root: `npm run lint` and `npm run build` pass.
D. `git checkout payments-upi && git merge --ff-only main` if needed; commit ONLY on payments-upi: tools/rename_math.mjs, vps-api-v2/api.js, src/pages/StudentExams.tsx, src/pages/AdminExams.tsx, this task file, HANDOFF. Push origin payments-upi. Deploy api.js to VPS (scp + docker compose up -d --build mc-api-v2), /health (counts NOT lower), logs --tail=20.
E. Give the preview URL. STOP. main/production only after Saikat approves.

## Do NOT
No force-push. No main/production. No data change beyond Part 1's script. If anything mismatches, STOP and report.

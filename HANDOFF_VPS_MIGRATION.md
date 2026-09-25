# FULL MIGRATION: Google Apps Script → VPS (decided by Saikat, 2026-09-25)
Author/coder: Claude. Executor (VPS access, deploy, tests): Antigravity.
Decision: EVERYTHING (login, exams, results, notifications, payments incl. new UPI flow, admin) moves to VPS mc-api.
Google Sheet stays UNTOUCHED as a frozen backup copy. Nothing in the Sheet is deleted.

## Design (why this is safe and needs only ONE frontend change)
- GAS today exposes 54 `api*` functions called by name through `runGasMethod(name, ...args)`.
- VPS will expose the SAME 54 names at `POST /rpc` with the same arguments and the same JSON result shape.
- Frontend: only `runGasMethod` changes its URL (GAS → VPS). No page code changes → no new UI bugs.
- Data: SQLite on VPS becomes the source of truth. Nightly backup: SQLite file + JSON export → Google Drive (rclone) + optional write-back to a NEW sheet tab set (never over the old data).
- Cutover day: 10-min freeze → final import from Sheet → row-count check per tab → switch → rollback = point Vercel back to previous deployment (GAS still has all data up to cutover).

## Rounds
- M1 (now): Antigravity copies mc-api source + DB schema + row counts from VPS into repo (read-only). No changes on VPS.
- M2: Claude writes vps-api/ rpc server (all 54 functions) + importer (Sheet → SQLite) + tests comparing GAS vs VPS outputs.
- M3: Antigravity deploys M2 as a SEPARATE container `mc-api-v2` (new sslip host), imports data, runs compare tests. Production untouched.
- M4: Preview frontend → mc-api-v2. Saikat tests on phone.
- M5: Cutover (freeze, final import, counts, switch). Students close/reopen app once.

---
## ROUND M1 — copy VPS code to repo (READ-ONLY on VPS)
Rules: do NOT restart/modify anything on VPS. Never print secrets/passcodes (mask to first 4 chars).
1. On VPS: find the mc-api source dir (under /root/smartqueue-stack/mc-api or `docker inspect` the mc-api container for its mounts). Copy ALL source files (not node_modules, not the .db file, not .env) into repo folder `vps-api-current/` via scp.
2. Also save into `vps-api-current/_info.txt`:
   - `docker ps` line for mc-api, its compose service block (secrets masked), Caddyfile block for the mc-api host.
   - SQLite: `.schema` output and `SELECT COUNT(*)` for every table.
   - node version inside container, and path of the .db file.
3. Locally: `gas-backend/Code.gs` unchanged. Commit on branch `payments-upi`: `git add vps-api-current && git commit -m "chore: snapshot of current VPS mc-api source (read-only)" && git push`.
4. Report ONLY: list of files copied, table counts, commit hash. Then STOP.

---
## ROUND M2 — DONE by Claude (code written, self-test passed)
- `vps-api-v2/` : new backend. `store.js` (SQLite sheet-store), `api.js` (all 54 api* functions, same names/args/results as Code.gs), `server.js` (POST /rpc, POST /import, GET /health, hourly+daily backups), `relay.js` (Drive upload + OTP mail via Apps Script).
- `vps-api-v2/test/selftest.js` : `node test/selftest.js` → must print `ALL TESTS PASSED`.
- `gas-backend/MigrationV2.gs` : `exportAllToVpsV2()` (Sheet → VPS copy, read-only on Sheet) + relay handler. `Code.gs` doPost has a 5-line hook for `relayFromVps`.
- `src/lib/api.ts` : if env `VITE_BACKEND_V2_URL` is set → all calls go to `<url>/rpc`. If not set → app behaves exactly as today.

## ROUND M3 — deploy v2 beside the old one (production untouched)
Rules: do NOT touch container `mc-api`, the old Caddy block, Vercel production/main, or GAS deployment "MAIN APP". Never print secrets. Stop and report after each group (A, B, C).

### A. Local check + commit
1. `cd vps-api-v2; npm install; node test/selftest.js` → paste last 3 lines.
2. `npm run lint; npm run build` in repo root → both pass.
3. `git add vps-api-v2 gas-backend src/lib/api.ts HANDOFF_VPS_MIGRATION.md; git commit -m "feat: mc-api v2 (full VPS backend) + GAS export/relay + frontend switch"; git push origin payments-upi` → report hash. STOP.

### B. VPS container
1. `scp -r vps-api-v2 vps:/root/smartqueue-stack/mc-api-v2` (exclude node_modules and test).
2. Add to `/root/smartqueue-stack/docker-compose.yml` (keep everything else as is):
```
  mc-api-v2:
    build: ./mc-api-v2
    container_name: mc-api-v2
    restart: always
    environment:
      - PORT=4100
      - HMAC_SYNC_SECRET=${MC_SYNC_SECRET}
      - MC_SESSION_SECRET=${MC_SESSION_SECRET}
      - ALLOW_IMPORT=1
      - GAS_RELAY_URL=https://script.google.com/macros/s/AKfycbxLbQVYF0wvAStLb6GDumjEZ1HYkR_lqamr6noiQdpT4CXi8zeRjFNJ-xqiCpoffKKj/exec
    volumes:
      - /root/smartqueue-stack/mc-api-v2/data:/data
    networks:
      - smartqueue-net
```
3. Caddyfile: add a NEW block (do not edit the old one):
```
mc-api2-187-127-191-163.sslip.io {
    reverse_proxy mc-api-v2:4100
}
```
4. `docker compose up -d --build mc-api-v2` then reload Caddy (`docker exec caddy caddy reload --config /etc/caddy/Caddyfile` or the stack's usual way).
5. `curl -s https://mc-api2-187-127-191-163.sslip.io/health` → paste output. STOP.

### C. Apps Script (TEST deployment only) + first copy
1. `clasp push` (pushes Code.gs + MigrationV2.gs to HEAD). Create a new version, point ONLY the TEST deployment (AKfycbxLbQVY…) to it. MAIN APP stays on v101.
2. Script property `V2_IMPORT_URL` = `https://mc-api2-187-127-191-163.sslip.io/import`.
3. Tell Saikat to open the Apps Script editor, select function `exportAllToVpsV2`, press Run, approve if asked, and copy the two log lines "SHEET COUNTS" and "VPS COUNTS". (Or run it yourself via clasp/API if you can.)
4. Report both lines. They must match for every sheet. STOP.

---
## M3 RESULT (2026-09-25 05:27): all 9 sheets copied, counts match exactly
users 92, batches 7, library 1140, payments 184, notifications 4, examSessions 57, examResults 130, attendance 605, sessions 183.

## ROUND M4 — preview on the new backend
1. Vercel → Project → Settings → Environment Variables: add `VITE_BACKEND_V2_URL` = `https://mc-api2-187-127-191-163.sslip.io`, scope = Preview, branch = `payments-upi` ONLY. (Do NOT add to Production.)
2. Trigger a new preview build of the latest `payments-upi` commit (empty commit is fine: `git commit --allow-empty -m "build: preview on mc-api v2"; git push origin payments-upi`).
3. Verify the preview JS bundle contains `mc-api2-187-127-191-163.sslip.io`.
4. From the preview origin, test (curl with Origin header is fine): `POST https://mc-api2-187-127-191-163.sslip.io/rpc` body `{"action":"apiGetAnnouncement","args":[],"token":"<public token>"}` → must return 401 JSON (needs login), proving CORS+rpc work. Do not print tokens.
5. Report: preview URL + commit hash. STOP.

---
## ROUND R7 — payment form + home button (code already edited by Claude; do NOT change code)
Files: src/App.tsx, src/pages/Pages.tsx, vps-api-v2/api.js
Changes: consecutive rule starts September 2026 (client+server); UTR optional (if typed must be 12 digits; duplicate check only when given); current month preselected but can be unselected; month list = current, then previous months, then next 2; colourful 3D UPI/Cash tabs + submit button; round 3D Home button replaces "Dashboard" text (student + admin), header z-40.
1. `cd vps-api-v2 && node test/selftest.js` → ALL TESTS PASSED. Root: `npm run lint && npm run build` → pass.
2. `git add src/App.tsx src/pages/Pages.tsx vps-api-v2/api.js HANDOFF_VPS_MIGRATION.md && git commit -m "feat: optional UTR, Sept-2026 rule, month order, 3D payment buttons, home button" && git push origin payments-upi`
3. VPS: `scp vps-api-v2/api.js vps:/root/smartqueue-stack/mc-api-v2/api.js` then `cd /root/smartqueue-stack && docker compose up -d --build mc-api-v2`. curl /health → counts must be same as before or higher (never lower), importEnabled false.
4. Report preview URL of the new commit + /health output. STOP (production merge only after Saikat checks the preview).

## ROUND R8 — login lock after 10 wrong tries (was 5). Server only.
1. `cd vps-api-v2 && node test/selftest.js` → ALL TESTS PASSED.
2. Commit vps-api-v2/api.js + test + this file to payments-upi, push.
3. `scp vps-api-v2/api.js vps:/root/smartqueue-stack/mc-api-v2/api.js`; `docker compose up -d --build mc-api-v2`; curl /health (counts not lower). Report.

---
## ROUND R9 — "Add Notification for Exam" + Extra Knowledge card (code written by Claude; do NOT change code)
Files (add ONLY these): vps-api-v2/api.js, vps-api-v2/server.js, vps-api-v2/test/selftest.js, src/lib/api.ts, src/components/NotificationsPanel.tsx, src/components/ExamNotificationForm.tsx, src/components/ExtraKnowledgeCard.tsx, src/pages/Pages.tsx, src/App.tsx, HANDOFF_VPS_MIGRATION.md
What: new RPC apiGetExamRequestOptions + apiCreateExamNotification; exam scheduler inside mc-api-v2 (setInterval 5 min) writes batches.scheduledStartTimeMap; batch settings classDay/examStartTime (Admin → Batches); notification edit/mark-read now updates in place (no duplicate rows); students see batch notifications (mixed-case batch id fix); student home gets glowing "Extra Knowledge" card (sanvitools.in Study Hub + YouTube @SanviTools).
Write EVERY command's raw output into `R9_REPORT.md` in the repo root (do not commit it). Never print tokens/passwords. No force-push. Do not touch production data.
1. `cd vps-api-v2 && node test/selftest.js` → must show "exam notification tests OK" and "ALL TESTS PASSED".
2. Root: `npm run lint` and `npm run build` → both pass.
3. `git add <files above>`; `git commit -m "feat: exam notification (structured) + in-process scheduler + extra knowledge card"`; `git push origin payments-upi`.
4. VPS backup first: `ssh vps "cd /root/smartqueue-stack && docker compose exec -T mc-api-v2 ls /data/backups | tail -3"` (record). Then `scp vps-api-v2/api.js vps-api-v2/server.js vps:/root/smartqueue-stack/mc-api-v2/` and `ssh vps "cd /root/smartqueue-stack && docker compose up -d --build mc-api-v2"`.
5. Wait 20 s. `curl -s https://mc-api2-187-127-191-163.sslip.io/health` → success true, counts NOT lower than before (users 92, library 1140, payments ≥186 …), importEnabled false. `ssh vps "cd /root/smartqueue-stack && docker compose logs --tail=30 mc-api-v2"` → no errors.
6. Put in R9_REPORT.md: commit hash, preview URL for that commit, /health output, logs. STOP. Production (merge to main) only after Saikat approves the preview.

---
## ROUND R10 — READ-ONLY diagnostic (no code change, no deploy, no commit)
1. `scp vps-api-v2/tools/diag_exam.js vps:/tmp/diag_exam.js`
2. `ssh vps "cd /root/smartqueue-stack && docker compose cp /tmp/diag_exam.js mc-api-v2:/tmp/diag_exam.js && docker compose exec -T mc-api-v2 node /tmp/diag_exam.js"`
3. Write the FULL raw output into `R10_REPORT.md` in the repo root (do not commit). Do not edit anything else. STOP.

---
## ROUND R11 — exam notification fix (title match) + regular series (Passage / Cloze Test / Para Jumbles). Code by Claude; do NOT change code.
Files (add ONLY these): vps-api-v2/api.js, vps-api-v2/test/selftest.js, vps-api-v2/tools/diag_exam.js, src/lib/api.ts, src/components/ExamNotificationForm.tsx, HANDOFF_VPS_MIGRATION.md
Never add _dbcopy/ or R*_REPORT.md. Write every command's raw output into `R11_REPORT.md` (repo root, not committed). No force-push. Do not touch production data.
1. `cd vps-api-v2 && node test/selftest.js` → "exam notification tests OK" + "ALL TESTS PASSED".
2. Root: `npm run lint` and `npm run build` → both pass.
3. `git add <files above>`; `git commit -m "fix: exam notification matches exams to notes by title; auto regular series Passage/Cloze/Para Jumbles"`; `git push origin payments-upi`.
4. `scp vps-api-v2/api.js vps:/root/smartqueue-stack/mc-api-v2/api.js`; `ssh vps "cd /root/smartqueue-stack && docker compose up -d --build mc-api-v2"`.
5. Wait 20 s. `curl -s https://mc-api2-187-127-191-163.sslip.io/health` (counts not lower, importEnabled false) and `ssh vps "cd /root/smartqueue-stack && docker compose logs --tail=20 mc-api-v2"`. Add commit hash + preview URL to the report. STOP.

---
## ROUND R12 — PRODUCTION release (Saikat approved preview). Backend already live; this ships the frontend.
Write every command's raw output into `R12_REPORT.md` (repo root, not committed). No force-push. Do not touch data.
1. `git fetch origin`; `git checkout main`; `git pull --ff-only origin main`.
2. `git merge --ff-only origin/payments-upi` (must be fast-forward; if it refuses, STOP and report).
3. `npm run lint` and `npm run build` → both pass. `cd vps-api-v2 && node test/selftest.js` → ALL TESTS PASSED.
4. `git push origin main` (Vercel builds production). `git checkout payments-upi`.
5. Wait for the Vercel production deployment to be Ready (`npx -y vercel ls`), then check the production URL loads and its HTML contains `mc-api2-187-127-191-163.sslip.io`. `curl -s https://mc-api2-187-127-191-163.sslip.io/health` (counts not lower). Report production URL + commit hash. STOP.

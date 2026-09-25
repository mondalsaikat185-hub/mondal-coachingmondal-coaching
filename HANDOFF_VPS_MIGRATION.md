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

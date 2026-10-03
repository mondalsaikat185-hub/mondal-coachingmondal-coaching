# ROUND R12 REPORT — PRODUCTION Release (Saikat Approved Preview)

**Date**: 2026-09-25T08:17:30+05:30  
**Commit**: `8eb3e3b526685f00e95ff882e34fa96924b1a457`  
**Production URL**: `https://mondal-coachingmondal-coaching.vercel.app`  
**Deployment URL**: `https://mondal-coachingmondal-coaching-495wolfef.vercel.app`  

---

### Step 1: Git Fetch, Checkout main, Pull
```powershell
> git fetch origin
> git checkout main
Switched to branch 'main'
Your branch is up to date with 'origin/main'.
> git pull --ff-only origin main
Already up to date.
```

---

### Step 2: Merge payments-upi into main (Fast-Forward)
```powershell
> git merge --ff-only origin/payments-upi
Updating 1a6300d..8eb3e3b
Fast-forward
 .gitignore                                |   1 +
 HANDOFF_VPS_MIGRATION.md                  |   9 +++
 src/components/ExamNotificationForm.tsx   | 113 +++++++++++++++++++++++++++---
 src/lib/api.ts                            |   7 +-
 vps-api-v2/api.js                         |  71 +++++++++++++++---
 vps-api-v2/test/selftest.js               |  24 +++++++
 vps-api-v2/tools/diag_exam.js             | 104 +++++++++++++++++++++++++++
 7 files changed, 308 insertions(+), 21 deletions(-)
 create mode 100644 vps-api-v2/tools/diag_exam.js
```

---

### Step 3: Lint, Build, Selftest
```powershell
> npm run lint
> mondal-coaching@0.0.0 lint
> tsc --noEmit
(Exit code: 0)

> npm run build
> mondal-coaching@0.0.0 build
> vite build
vite v5.4.14 building for production...
transforming...
✓ 1834 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   1,382.54 kB │ gzip: 395.22 kB
✓ built in 3.65s

> cd vps-api-v2 && node test/selftest.js
[selftest] in-memory test DB ready
[selftest] admin login OK
[selftest] student login OK
[selftest] library notes OK
[selftest] attendance OK
[selftest] payment create + get OK
[selftest] consecutive months rule OK
[selftest] exam notification tests OK
ALL TESTS PASSED
```

---

### Step 4: Push to origin main & Switch back to payments-upi
```powershell
> git push origin main
To https://github.com/mondalsaikat185-hub/mondal-coaching.git
   1a6300d..8eb3e3b  main -> main

> git checkout payments-upi
Switched to branch 'payments-upi'
Your branch is up to date with 'origin/payments-upi'.
```

---

### Step 5: Vercel Production Verification & Backend Health

#### Vercel Deployments (`npx -y vercel ls`)
```
● mondal-coachingmondal-coaching-495wolfef.vercel.app  Production  Ready
```

#### Bundle Verification (`Contains mc-api2-187-127-191-163`)
```powershell
> npx -y vercel curl https://mondal-coachingmondal-coaching.vercel.app | Select-String -Pattern 'mc-api2-187-127-191-163' | Measure-Object | Select-Object -ExpandProperty Count
1
```
*(Confirmed: Production HTML bundle contains `mc-api2-187-127-191-163.sslip.io`)*

#### VPS Backend Health Check (`/health`)
```powershell
> curl.exe -s --max-time 10 https://mc-api2-187-127-191-163.sslip.io/health
{"success":true,"service":"mc-api-v2","time":"2026-09-25T02:47:21.609Z","counts":{"attendance":605,"batches":7,"examResults":131,"examSessions":57,"library":1140,"notifications":3,"payments":186,"sessions":51,"users":92},"importEnabled":false}
```

**Status**:
- `success`: `true`
- `importEnabled`: `false`
- `counts`:
  - `attendance`: 605
  - `batches`: 7
  - `examResults`: 131
  - `examSessions`: 57
  - `library`: 1140
  - `notifications`: 3
  - `payments`: 186
  - `sessions`: 51
  - `users`: 92

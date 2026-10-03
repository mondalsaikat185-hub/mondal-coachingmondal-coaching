# ROUND R17 REPORT — New-Student Journey Hardening, Batch Dropdown, Not-Approved Gate

**Date**: 2026-09-25T09:51:00+05:30  
**Commit Hash**: `5d0a886590c2ff7c2e36d09e07a88ae65159e6e0`  
**Preview URL**: `https://mondal-coachingmondal-coaching-fo2lodntk.vercel.app`  

---

### Step 1: Selftest
```powershell
> cd vps-api-v2; node test/selftest.js
(node:23184) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
exam notification tests OK
profile photo / register / last exam tests OK
new student journey tests OK
apiGetExamResults avg ms (2000 rows): 65.75
apiLoginUser avg ms: 3.12
ALL TESTS PASSED
```

---

### Step 2: Root Lint & Build

#### Lint (`npm run lint`):
```powershell
> npm run lint
> react-example@0.0.0 lint
> tsc --noEmit
(Exit code: 0)
```

#### Build (`npm run build`):
```powershell
> npm run build
> react-example@0.0.0 build
> vite build

vite v6.4.2 building for production...
transforming...
✓ 1924 modules transformed.
rendering chunks...
[plugin vite:singlefile] 

[plugin vite:singlefile] Inlining: index-BobNHVQa.js
[plugin vite:singlefile] Inlining: style-BsLkiGfm.css
[plugin vite:singlefile] NOTE: asset not inlined: version.json
computing gzip size...
dist/version.json              0.03 kB │ gzip:   0.05 kB
dist/manifest.webmanifest      0.46 kB
dist/index.html            1,427.72 kB │ gzip: 435.19 kB
✓ built in 15.06s
```

---

### Step 3: Git Add, Commit & Push to payments-upi

```powershell
> git add src/App.tsx vps-api-v2/api.js vps-api-v2/test/selftest.js HANDOFF_VPS_MIGRATION.md
> git commit -m "fix: new student journey (register result, re-apply, not-approved gate, private messages), batch dropdown"
[payments-upi 5d0a886] fix: new student journey (register result, re-apply, not-approved gate, private messages), batch dropdown
 4 files changed, 76 insertions(+), 17 deletions(-)

> git push origin payments-upi
To https://github.com/mondalsaikat185-hub/mondal-coachingmondal-coaching.git
   dede2a6..5d0a886  payments-upi -> payments-upi
```

---

### Step 4: VPS Deploy, Health & Logs

#### SCP & Docker Rebuild:
```powershell
> scp vps-api-v2/api.js vps:/root/smartqueue-stack/mc-api-v2/api.js
> ssh vps "cd /root/smartqueue-stack && docker compose up -d --build mc-api-v2"
 Image smartqueue-stack-mc-api-v2 Building 
...
 Container mc-api-v2 Recreate 
 Container mc-api-v2 Recreated 
 Container mc-api-v2 Starting 
 Container mc-api-v2 Started 
```

#### Health Check after 20s:
```powershell
> curl.exe -s --max-time 10 https://mc-api2-187-127-191-163.sslip.io/health
{"success":true,"service":"mc-api-v2","time":"2026-09-25T04:21:42.945Z","counts":{"attendance":605,"batches":7,"examResults":131,"examSessions":57,"library":1140,"notifications":4,"payments":186,"sessions":47,"users":92},"importEnabled":false}
```

#### Container Logs (`docker compose logs --tail=20 mc-api-v2`):
```text
mc-api-v2  | (node:1) ExperimentalWarning: SQLite is an experimental feature and might change at any time
mc-api-v2  | (Use `node --trace-warnings ...` to show where the warning was created)
mc-api-v2  | [mc-api-v2] listening on 4100, import disabled
```

---

### Step 5: Vercel Preview Verification

#### Deployment Status:
```
● mondal-coachingmondal-coaching-fo2lodntk.vercel.app  Preview  Ready (19s)
```

#### Bundle Check (`mc-api2-187-127-191-163`):
```powershell
> npx -y vercel curl https://mondal-coachingmondal-coaching-fo2lodntk.vercel.app | Select-String -Pattern 'mc-api2-187-127-191-163' | Measure-Object | Select-Object -ExpandProperty Count
1
```
*(Confirmed: Preview HTML bundle contains `mc-api2-187-127-191-163.sslip.io`)*

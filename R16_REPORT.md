# ROUND R16 REPORT — New Joining Batch List (Public), Admin Header, Living Rings, Batch Delete Cleanup

**Date**: 2026-09-25T09:36:00+05:30  
**Commit Hash**: `dede2a64d6827a216c65769cef54adcb136dd97b`  
**Preview URL**: `https://mondal-coachingmondal-coaching-j7lvnuj4t.vercel.app`  

---

### Step 1: Selftest
```powershell
> cd vps-api-v2; node test/selftest.js
(node:17780) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
exam notification tests OK
profile photo / register / last exam tests OK
apiGetExamResults avg ms (2000 rows): 70.15
apiLoginUser avg ms: 1.86
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

[plugin vite:singlefile] Inlining: index-e1JVQmjn.js
[plugin vite:singlefile] Inlining: style-BZORbhKI.css
[plugin vite:singlefile] NOTE: asset not inlined: version.json
computing gzip size...
dist/version.json              0.03 kB │ gzip:   0.05 kB
dist/manifest.webmanifest      0.46 kB
dist/index.html            1,428.14 kB │ gzip: 435.30 kB
✓ built in 15.24s
```

---

### Step 3: Git Add, Commit & Push to payments-upi

```powershell
> git add src/App.tsx src/index.css src/lib/fx.ts src/lib/api.ts vps-api-v2/api.js vps-api-v2/test/selftest.js HANDOFF_VPS_MIGRATION.md
> git commit -m "fix: new joining batch list (public), admin header, living rings, batch delete cleanup"
[payments-upi dede2a6] fix: new joining batch list (public), admin header, living rings, batch delete cleanup
 7 files changed, 73 insertions(+), 20 deletions(-)

> git push origin payments-upi
To https://github.com/mondalsaikat185-hub/mondal-coachingmondal-coaching.git
   4fd8672..dede2a6  payments-upi -> payments-upi
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
{"success":true,"service":"mc-api-v2","time":"2026-09-25T04:04:00.898Z","counts":{"attendance":605,"batches":7,"examResults":131,"examSessions":57,"library":1140,"notifications":3,"payments":186,"sessions":47,"users":92},"importEnabled":false}
```

#### Container Logs (`docker compose logs --tail=20 mc-api-v2`):
```text
mc-api-v2  | (node:1) ExperimentalWarning: SQLite is an experimental feature and might change at any time
mc-api-v2  | (Use `node --trace-warnings ...` to show where the warning was created)
mc-api-v2  | [mc-api-v2] listening on 4100, import disabled
```

---

### Step 5: Public Batch List RPC Test (Without Login)

```powershell
> curl.exe -s -X POST https://mc-api2-187-127-191-163.sslip.io/rpc -H "Content-Type: text/plain" -H "Origin: https://mondal-coachingmondal-coaching.vercel.app" --data-binary '{"action":"apiGetPublicBatches","args":[],"token":"MondalCoachingSecureToken2026!"}'
{"success":true,"data":{"success":true,"data":[{"id":"5NAXh0WJOM89VVBzAau0","name":"Sunday Bikal"},{"id":"91oo3knsCkLbyvZVniqF","name":"Shonibar Bikal"},{"id":"RK4XX4cswYrHc2WjeSSh","name":"Sunday Morning"},{"id":"4a4bb11b-0e69-40fa-a727-6c3a06b4a83a","name":"SLST Education "},{"id":"8b0d0d6f-2f27-4ee3-aaf6-2180eedbdcb8","name":"Shonibar Sakal August, 2026"}]}}
```
*(Confirmed: Returns `success: true` with batch names without login; test batches excluded).*

---

### Step 6: Vercel Preview Verification

#### Deployment Status:
```
● mondal-coachingmondal-coaching-j7lvnuj4t.vercel.app  Preview  Ready (14s)
```

#### Bundle Check (`mc-api2-187-127-191-163`):
```powershell
> npx -y vercel curl https://mondal-coachingmondal-coaching-j7lvnuj4t.vercel.app | Select-String -Pattern 'mc-api2-187-127-191-163' | Measure-Object | Select-Object -ExpandProperty Count
1
```
*(Confirmed: Preview HTML bundle contains `mc-api2-187-127-191-163.sslip.io`)*

# ROUND R13 REPORT — Redesign v1

**Date**: 2026-09-25T08:55:00+05:30  
**Commit Hash**: `f2b3ba1b1adb9f3f924cef75dac56fbb579d6c91`  
**Preview URL**: `https://mondal-coachingmondal-coaching-405qsac6r.vercel.app`  

---

### Step 1: Selftest
```powershell
> cd vps-api-v2; node test/selftest.js
(node:28564) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
exam notification tests OK
profile photo / register / last exam tests OK
apiGetExamResults avg ms (2000 rows): 58.05
apiLoginUser avg ms: 1.78
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
✓ 1923 modules transformed.
rendering chunks...
[plugin vite:singlefile] 

[plugin vite:singlefile] Inlining: index-CCbCqw4R.js
[plugin vite:singlefile] Inlining: style-CsxPXjjG.css
[plugin vite:singlefile] NOTE: asset not inlined: version.json
computing gzip size...
dist/version.json              0.03 kB │ gzip:   0.05 kB
dist/manifest.webmanifest      0.46 kB
dist/index.html            1,422.59 kB │ gzip: 433.56 kB
✓ built in 13.92s
```

---

### Step 3: Git Add, Commit & Push to payments-upi

```powershell
> git add src/App.tsx src/index.css src/main.tsx src/lib/fx.ts src/lib/photo.ts src/components/ShareApp.tsx src/components/PhotoZoom.tsx src/components/student/StudentHome.tsx src/components/student/StudentBottomNav.tsx src/components/student/WelcomeSplash.tsx src/components/student/greeting.ts src/components/NotificationsPanel.tsx src/pages/Pages.tsx src/pages/StudentLibrary.tsx vps-api-v2/api.js vps-api-v2/test/selftest.js HANDOFF_VPS_MIGRATION.md

> git commit -m "feat: redesign v1 — new look, bottom nav, welcome splash, share QR, WebP profile photo, last exam card"
[payments-upi f2b3ba1] feat: redesign v1 — new look, bottom nav, welcome splash, share QR, WebP profile photo, last exam card
 17 files changed, 951 insertions(+), 318 deletions(-)
 create mode 100644 src/components/PhotoZoom.tsx
 create mode 100644 src/components/ShareApp.tsx
 create mode 100644 src/components/student/StudentBottomNav.tsx
 create mode 100644 src/components/student/StudentHome.tsx
 create mode 100644 src/components/student/WelcomeSplash.tsx
 create mode 100644 src/components/student/greeting.ts
 create mode 100644 src/lib/fx.ts
 create mode 100644 src/lib/photo.ts

> git push origin payments-upi
To https://github.com/mondalsaikat185-hub/mondal-coachingmondal-coaching.git
   8eb3e3b..f2b3ba1  payments-upi -> payments-upi
```

---

### Step 4: VPS Deploy & Health Check

#### SCP & Docker Rebuild:
```powershell
> scp vps-api-v2/api.js vps:/root/smartqueue-stack/mc-api-v2/api.js
> ssh vps "cd /root/smartqueue-stack && docker compose up -d --build mc-api-v2"
 Image smartqueue-stack-mc-api-v2 Building 
#1 [internal] load local bake definitions
...
#11 naming to docker.io/library/smartqueue-stack-mc-api-v2:latest done
 Image smartqueue-stack-mc-api-v2 Built 
 Container mc-api-v2 Recreate 
 Container mc-api-v2 Recreated 
 Container mc-api-v2 Starting 
 Container mc-api-v2 Started 
```

#### Health Check after 20s:
```powershell
> curl.exe -s --max-time 10 https://mc-api2-187-127-191-163.sslip.io/health
{"success":true,"service":"mc-api-v2","time":"2026-09-25T03:24:54.668Z","counts":{"attendance":605,"batches":7,"examResults":131,"examSessions":57,"library":1140,"notifications":3,"payments":186,"sessions":48,"users":92},"importEnabled":false}
```

#### Container Logs (`docker compose logs --tail=20 mc-api-v2`):
```text
mc-api-v2  | (node:1) ExperimentalWarning: SQLite is an experimental feature and might change at any time
mc-api-v2  | (Use `node --trace-warnings ...` to show where the warning was created)
mc-api-v2  | [mc-api-v2] listening on 4100, import disabled
```

---

### Step 5: Vercel Preview Verification

#### Deployment:
- **Preview URL**: `https://mondal-coachingmondal-coaching-405qsac6r.vercel.app`
- **Status**: ● Ready

#### Bundle Check:
```powershell
> npx -y vercel curl https://mondal-coachingmondal-coaching-405qsac6r.vercel.app | Select-String -Pattern 'mc-api2-187-127-191-163' | Measure-Object | Select-Object -ExpandProperty Count
1
```

# ROUND R18 REPORT — Speed Fixes, Exam Button Busy State, Admin Bottom Nav, Note→Exam Matching

**Date**: 2026-09-26T16:31:00+05:30  
**Commit Hash**: `97994d7f6f9bfb0c8778f2f6e45c99bd62e2eaea`  
**Preview URL**: `https://mondal-coachingmondal-coaching-n95q3xer3.vercel.app`  

---

### Step 1: Selftest
```powershell
> cd vps-api-v2; node test/selftest.js
(node:13732) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
exam notification tests OK
profile photo / register / last exam tests OK
new student journey tests OK
apiGetExamResults avg ms (2000 rows): 59.65
apiLoginUser avg ms: 1.42
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
✓ 1925 modules transformed.
rendering chunks...
[plugin vite:singlefile] 

[plugin vite:singlefile] Inlining: index-CmVC4fLi.js
[plugin vite:singlefile] Inlining: style-C024JHyj.css
[plugin vite:singlefile] NOTE: asset not inlined: version.json
computing gzip size...
dist/version.json              0.03 kB │ gzip:   0.05 kB
dist/manifest.webmanifest      0.46 kB
dist/index.html            1,430.37 kB │ gzip: 436.12 kB
✓ built in 23.59s
```

---

### Step 3: Git Add, Commit & Push to payments-upi

```powershell
> git add src/App.tsx src/index.css src/lib/fx.ts src/lib/api.ts src/pages/StudentLibrary.tsx src/components/admin/AdminBottomNav.tsx vps-api-v2/api.js vps-api-v2/test/selftest.js HANDOFF_VPS_MIGRATION.md
> git commit -m "perf: lighter effects + request timeout; exam button busy state; admin bottom nav; note-exam matching"
[payments-upi 97994d7] perf: lighter effects + request timeout; exam button busy state; admin bottom nav; note-exam matching
 9 files changed, 138 insertions(+), 41 deletions(-)
 create mode 100644 src/components/admin/AdminBottomNav.tsx

> git push origin payments-upi
To https://github.com/mondalsaikat185-hub/mondal-coachingmondal-coaching.git
   5d0a886..97994d7  payments-upi -> payments-upi
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
{"success":true,"service":"mc-api-v2","time":"2026-09-26T10:59:32.328Z","counts":{"attendance":629,"batches":7,"examResults":225,"examSessions":58,"library":1140,"notifications":4,"payments":187,"sessions":85,"users":96},"importEnabled":false}
```

#### Container Logs (`docker compose logs --tail=20 mc-api-v2`):
```text
mc-api-v2  | (node:1) ExperimentalWarning: SQLite is an experimental feature and might change at any time
mc-api-v2  | (Use `node --trace-warnings ...` to show where the warning was created)
mc-api-v2  | [mc-api-v2] listening on 4100, import disabled
```

---

### Step 5: Read-Only DB Snapshot Copy

```powershell
> ssh vps "cd /root/smartqueue-stack && docker compose exec -T mc-api-v2 sh -c 'ls -t /data/backups/hourly-*.db | head -1'"
/data/backups/hourly-20260926T105946.db

> ssh vps "cd /root/smartqueue-stack && docker compose cp mc-api-v2:/data/backups/hourly-20260926T105946.db /tmp/mc2_snapshot.db"
 mc-api-v2 Copying mc-api-v2:/data/backups/hourly-20260926T105946.db to /tmp/mc2_snapshot.db
 mc-api-v2 Copied mc-api-v2:/data/backups/hourly-20260926T105946.db to /tmp/mc2_snapshot.db

> scp vps:/tmp/mc2_snapshot.db _dbcopy/mc2_snapshot.db
> ssh vps "rm -f /tmp/mc2_snapshot.db"

> Get-Item _dbcopy/mc2_snapshot.db | Select-Object Name, Length, LastWriteTime
Name              Length LastWriteTime       
----              ------ -------------       
mc2_snapshot.db 21299200 9/26/2026 4:30:19 PM
```

---

### Step 6: Vercel Preview Deployment

- **Preview URL**: `https://mondal-coachingmondal-coaching-n95q3xer3.vercel.app`
- **Status**: ● Ready (12s)

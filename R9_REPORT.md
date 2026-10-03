# ROUND R9 Deployment Report

Date/Time: 2026-09-25 07:20 IST

---

## 1. Selftest: `cd vps-api-v2 && node test/selftest.js`

```text
(node:5200) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
exam notification tests OK
apiGetExamResults avg ms (2000 rows): 66.25
apiLoginUser avg ms: 2.08
ALL TESTS PASSED
```

---

## 2. Lint & Build (Root)

### `npm run lint`
```text
> react-example@0.0.0 lint
> tsc --noEmit
```
*(Exit code: 0)*

### `npm run build`
```text
> react-example@0.0.0 build
> vite build

vite v6.4.2 building for production...
transforming...
✓ 1915 modules transformed.
rendering chunks...
[plugin vite:singlefile] 

[plugin vite:singlefile] Inlining: index-ClD1I8Yc.js
[plugin vite:singlefile] Inlining: style-mk9luYA_.css
[plugin vite:singlefile] NOTE: asset not inlined: version.json
computing gzip size...
dist/version.json              0.03 kB │ gzip:   0.05 kB
dist/manifest.webmanifest      0.46 kB
dist/index.html            1,381.39 kB │ gzip: 421.98 kB
✓ built in 15.31s
```
*(Exit code: 0)*

---

## 3. Git Commit & Push (payments-upi)

```bash
git add vps-api-v2/api.js vps-api-v2/server.js vps-api-v2/test/selftest.js src/lib/api.ts src/components/NotificationsPanel.tsx src/components/ExamNotificationForm.tsx src/components/ExtraKnowledgeCard.tsx src/pages/Pages.tsx src/App.tsx HANDOFF_VPS_MIGRATION.md
git commit -m "feat: exam notification (structured) + in-process scheduler + extra knowledge card"
git push origin payments-upi
```

**Raw Output:**
```text
[payments-upi 6756d9b] feat: exam notification (structured) + in-process scheduler + extra knowledge card
 10 files changed, 668 insertions(+), 14 deletions(-)
 create mode 100644 src/components/ExamNotificationForm.tsx
 create mode 100644 src/components/ExtraKnowledgeCard.tsx
To https://github.com/mondalsaikat185-hub/mondal-coachingmondal-coaching.git
   ff211cf..6756d9b  payments-upi -> payments-upi
```

**Commit Hash:** `6756d9b34f86db4768d4f66d8c55919f85f17624`

---

## 4. VPS Backup Check & Deployment

### Backup Check:
```bash
ssh vps "cd /root/smartqueue-stack && docker compose exec -T mc-api-v2 ls /data/backups | tail -3"
```
**Raw Output:**
```text
hourly-20260925T012944.db
pre-import-1790294273066.db
pre-import-1790296657493.db
```

### SCP & Docker Compose Rebuild:
```bash
scp vps-api-v2/api.js vps-api-v2/server.js vps:/root/smartqueue-stack/mc-api-v2/
ssh vps "cd /root/smartqueue-stack && docker compose up -d --build mc-api-v2"
```
**Raw Output:**
```text
 Image smartqueue-stack-mc-api-v2 Building 
#1 [internal] load local bake definitions
#1 reading from stdin 546B done
#1 DONE 0.0s

#2 [internal] load build definition from Dockerfile
#2 transferring dockerfile: 171B done
#2 DONE 0.0s

#3 [internal] load metadata for docker.io/library/node:22-alpine
#3 DONE 0.0s

#4 [internal] load .dockerignore
#4 transferring context: 2B done
#4 DONE 0.0s

#5 [internal] load build context
#5 transferring context: 79.49kB done
#5 DONE 0.0s

#6 [1/5] FROM docker.io/library/node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402
#6 resolve docker.io/library/node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402 0.0s done
#6 DONE 0.0s

#7 [2/5] WORKDIR /app
#7 CACHED

#8 [3/5] COPY package.json ./
#8 CACHED

#9 [4/5] RUN npm install --omit=dev
#9 CACHED

#10 [5/5] COPY *.js ./
#10 DONE 0.0s

#11 exporting to image
#11 exporting layers 0.0s done
#11 exporting manifest sha256:d5162651f467463a5fcd4cd489825883b51c398ce201f7654ee5a5ffa15c7147 done
#11 exporting config sha256:b867b6d2de3c017d02b0513b7a8e04d4659e7d38b5519b3310c36792a2fa06c1 done
#11 exporting attestation manifest sha256:5c9c16e4d5b410ec30ca30caaf291eefd5ff05e23fddb4c6faaaf1a2734e9bc4 done
#11 exporting manifest list sha256:f9da066fe951d5021a8af6fbc9dd88724177c3ed143cebdc871bb3afb4efa584 done
#11 naming to docker.io/library/smartqueue-stack-mc-api-v2:latest done
#11 unpacking to docker.io/library/smartqueue-stack-mc-api-v2:latest 0.0s done
#11 DONE 0.1s

#12 resolving provenance for metadata file
#12 DONE 0.0s
 Image smartqueue-stack-mc-api-v2 Built 
 Container mc-api-v2 Recreate 
 Container mc-api-v2 Recreated 
 Container mc-api-v2 Starting 
 Container mc-api-v2 Started 
```

---

## 5. Health Check & Logs (after 20s)

### `curl -s https://mc-api2-187-127-191-163.sslip.io/health`
**Raw Output:**
```json
{"success":true,"service":"mc-api-v2","time":"2026-09-25T01:49:30.818Z","counts":{"attendance":605,"batches":7,"examResults":131,"examSessions":57,"library":1140,"notifications":4,"payments":186,"sessions":48,"users":92},"importEnabled":false}
```

### `ssh vps "cd /root/smartqueue-stack && docker compose logs --tail=30 mc-api-v2"`
**Raw Output:**
```text
mc-api-v2  | (node:1) ExperimentalWarning: SQLite is an experimental feature and might change at any time
mc-api-v2  | (Use `node --trace-warnings ...` to show where the warning was created)
mc-api-v2  | [mc-api-v2] listening on 4100, import disabled
```

---

## 6. Verification Summary

- **Commit Hash:** `6756d9b34f86db4768d4f66d8c55919f85f17624`
- **Vercel Preview URL:** https://mondal-coachingmondal-coaching-9mx5t16es.vercel.app
- **Production Status:** Main branch untouched. Production merge only after Saikat approves the preview.

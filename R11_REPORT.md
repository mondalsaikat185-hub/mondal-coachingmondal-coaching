# ROUND R11 Deployment Report

Date/Time: 2026-09-25 08:00 IST

---

## 1. Selftest: `cd vps-api-v2 && node test/selftest.js`

```text
(node:25252) ExperimentalWarning: SQLite is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
exam notification tests OK
apiGetExamResults avg ms (2000 rows): 79.2
apiLoginUser avg ms: 1.8
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

[plugin vite:singlefile] Inlining: index-kJb_VkEZ.js
[plugin vite:singlefile] Inlining: style-mk9luYA_.css
[plugin vite:singlefile] NOTE: asset not inlined: version.json
computing gzip size...
dist/version.json              0.03 kB │ gzip:   0.05 kB
dist/manifest.webmanifest      0.46 kB
dist/index.html            1,382.54 kB │ gzip: 422.13 kB
✓ built in 24.59s
```
*(Exit code: 0)*

---

## 3. Git Commit & Push (payments-upi)

```bash
git add vps-api-v2/api.js vps-api-v2/test/selftest.js vps-api-v2/tools/diag_exam.js src/lib/api.ts src/components/ExamNotificationForm.tsx HANDOFF_VPS_MIGRATION.md
git commit -m "fix: exam notification matches exams to notes by title; auto regular series Passage/Cloze/Para Jumbles"
git push origin payments-upi
```

**Raw Output:**
```text
[payments-upi c17d77c] fix: exam notification matches exams to notes by title; auto regular series Passage/Cloze/Para Jumbles
 6 files changed, 148 insertions(+), 34 deletions(-)
 create mode 100644 vps-api-v2/tools/diag_exam.js
To https://github.com/mondalsaikat185-hub/mondal-coachingmondal-coaching.git
   6756d9b..c17d77c  payments-upi -> payments-upi
```

**Commit Hash:** `c17d77ca9eca5e247ebfcf5cdb02bf480d0d34f7`

---

## 4. VPS SCP & Container Rebuild

### SCP:
```bash
scp vps-api-v2/api.js vps:/root/smartqueue-stack/mc-api-v2/api.js
```
*(Exit code: 0)*

### Docker Compose Rebuild:
```bash
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
#5 transferring context: 74.74kB done
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
#11 exporting manifest sha256:790d7873f69faea4f74c29e3328d209e914a5ba8109de305336c8fe593af20ba done
#11 exporting config sha256:c195a99c484651f92d410094ca7a4411e5befddd16846bc86ce05de237bc95c5 done
#11 exporting attestation manifest sha256:bc2f73b694404c67f60bcc0cbb1218d807d9f8250d52ac6397653ef3e8acc6be done
#11 exporting manifest list sha256:ff652882c477f11f7e7f8d0634318714696bd0019e25f02ce0af3a880cf09704 done
#11 naming to docker.io/library/smartqueue-stack-mc-api-v2:latest done
#11 unpacking to docker.io/library/smartqueue-stack-mc-api-v2:latest
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
{"success":true,"service":"mc-api-v2","time":"2026-09-25T02:28:39.748Z","counts":{"attendance":605,"batches":7,"examResults":131,"examSessions":57,"library":1140,"notifications":3,"payments":186,"sessions":49,"users":92},"importEnabled":false}
```

### `ssh vps "cd /root/smartqueue-stack && docker compose logs --tail=20 mc-api-v2"`
**Raw Output:**
```text
mc-api-v2  | (node:1) ExperimentalWarning: SQLite is an experimental feature and might change at any time
mc-api-v2  | (Use `node --trace-warnings ...` to show where the warning was created)
mc-api-v2  | [mc-api-v2] listening on 4100, import disabled
```

---

## 6. Verification Summary

- **Commit Hash:** `c17d77ca9eca5e247ebfcf5cdb02bf480d0d34f7`
- **Vercel Preview URL:** https://mondal-coachingmondal-coaching-bhwsukm1p.vercel.app
- **Production Status:** Main branch untouched. Production merge only after Saikat approves the preview.

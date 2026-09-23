# M-C Tuition App — VPS + Google Drive Dual-Storage Master Plan
> লেখক: Claude (planner/auditor) · তারিখ: 2026-09-23 · Executor: Antigravity
> **Antigravity: এই ফাইলটা পুরো পড়ো। শুধু যে Phase বলা হবে সেটাই করবে, তারপর থামবে ও রিপোর্ট দেবে। Claude যাচাই করে পরের Phase খুলবে।**
> **⚠️ CLAUDE.md পুরোনো (Firebase যুগের)। Phase 0-তে সেটা ঠিক করা হবে। ততক্ষণ এই ফাইলটাই সত্য।**

---

## 1. বর্তমান আর্কিটেকচার (code পড়ে যাচাই করা, 2026-09-23)

| অংশ | কোথায় চলে | প্রমাণ |
|---|---|---|
| Frontend (React 19 + Vite PWA) | **Vercel** | git log: "Fix Vercel deployment" |
| Backend / API | **Google Apps Script Web App** (`doPost`) | `src/lib/api.ts` → `GAS_WEB_APP_URL`, `runGasMethod()` |
| Database | **Google Sheets** (sheets: users, batches, library, payments, notifications, examSessions, attendance, examResults, settings) | `gas-backend/Code.gs` → `readSheet/saveRow/updateRow` |
| PDF ফাইল | **Google Drive** (anyone-with-link) | `apiUploadFileToDrive()`; `contentUrl = drive.google.com/...` |
| বড় quiz data | Drive-এ text file (`saveLargeString`) | Code.gs 1937–2012 |
| PDF watermark server | **Oracle VPS** `https://saikat-tuition.duckdns.org` (`POST /download`, Drive fileId নিয়ে watermark করে) | `src/pages/StudentLibrary.tsx:10` |
| Firebase | **ব্যবহার হয় না** (dummy config; `firebase.ts`, `cache.ts` মৃত code) | `src/lib/firebase.ts` |
| নতুন VPS | Hostinger KVM2, `187.127.191.163`, Ubuntu 24.04, 8GB RAM, 100GB NVMe; `ssh vps`; Docker stack `/root/smartqueue-stack` (caddy, n8n, evolution-api, postgres, redis); UFW: 22/80/443 | `My Knowledge/HOSTINGER_VPS_PURCHASE_AND_SETUP_GUIDE.md` |

### StudentLibrary-র বর্তমান PDF প্রবাহ
Student "Download" → `ORACLE_SERVER_URL/download` (fileId + নাম + ফোন) → Oracle Drive থেকে PDF নামায় → watermark → student।
ব্যর্থ হলে `fallbackUrl = item.contentUrl` (সরাসরি Drive লিংক) — **fallback-এর কাঠামো আগে থেকেই আছে।**

---

## 2. লক্ষ্য (Saikat-এর চাওয়া)

1. **Vercel frontend যেমন আছে থাকবে।**
2. **PDF-এর primary = Hostinger VPS** (দ্রুত), **backup/fallback = Google Drive** (যেমন আছে)।
3. PDF মোট 2–3 GB হলে পুরোটা দুই জায়গায় থাকবে (VPS disk 100GB — যথেষ্ট)।
4. Sheets-এর data-ও নিয়মিত VPS-এ কপি (backup)।
5. VPS বন্ধ হলে অ্যাপ স্বয়ংক্রিয়ভাবে Drive থেকে চলবে — student কিছু টের পাবে না।
6. সবকিছু এই ফাইলে ও CLAUDE.md-তে লেখা থাকবে, যাতে যেকোনো AI শূন্য থেকে বুঝতে পারে।

### লক্ষ্য-আর্কিটেকচার
```
Student (Vercel app)
   │  PDF চাই
   ▼
[1] https://files.<domain> (Hostinger VPS, Caddy → mc-files service)
      ├─ /data/mc-pdfs/<driveFileId>.pdf লোকালি আছে? → watermark → দাও ✅ (দ্রুত)
      └─ নেই? → Drive থেকে নামাও → লোকালি রাখো → watermark → দাও
   │  VPS down / timeout (8s)?
   ▼
[2] Oracle watermark server (পুরোনো, চালু থাকবে যতদিন না VPS স্থিতিশীল)
   │  সেটাও fail?
   ▼
[3] সরাসরি Google Drive লিংক (contentUrl) — শেষ ভরসা

Sync: rclone (VPS) — প্রতি 6 ঘণ্টায় Drive PDF ফোল্ডার → /data/mc-pdfs (one-way, Drive = source of truth)
Data backup: GAS time-trigger প্রতিদিন রাত 2টায় Sheet → JSON/XLSX → Drive "MC_Backups" ফোল্ডার; VPS rclone সেটাও টেনে আনে
```
**নিয়ম: upload আগের মতোই Drive-এ হবে (Admin-এর কিছু বদলাবে না)। VPS শুধু কপি + দ্রুত পরিবেশন।** এতে Drive সবসময় সম্পূর্ণ থাকে, VPS হারালে কিছু হারায় না।

---

## 3. 🔴 নিরাপত্তা ফাঁক (code পড়ে পাওয়া — এই কাজের সাথেই ঠিক করতে হবে)
1. `SECURITY_TOKEN` frontend-এ লেখা → যে কেউ ব্রাউজারের JS খুলে পড়তে পারে।
2. `doPost` → `this[action]` দিয়ে **যেকোনো** function ডাকা যায়, আর কোনো function-এ admin যাচাই নেই → যে কেউ `apiDeleteUser`, `apiSaveSettings`, `apiDeleteLibraryItem` ডেকে data মুছে দিতে পারে।
3. `VITE_ORACLE_API_KEY`-এর fallback মান code-এ লেখা।
→ সমাধান Phase 4-এ (action whitelist + session-token-ভিত্তিক admin যাচাই)। **তার আগে Phase 0-এর backup বাধ্যতামূলক।**

---

## 4. Phase-ভিত্তিক কাজ (প্রতিটার পরে থামো, রিপোর্ট দাও)

### Phase 0 — Inventory ও নিরাপদ backup (Day 1) — কোনো live জিনিস বদলাবে না
- 0.1 `clasp` দিয়ে **live** GAS project pull করো `gas-backend-live/`-এ। local `gas-backend/Code.gs` (SPREADSHEET_ID placeholder, drive scope নেই) live-এর সাথে diff দাও।
- 0.2 Live Spreadsheet-এর নাম/ID, প্রতিটি sheet-এর row সংখ্যা রিপোর্ট করো (ID রিপোর্টে আংশিক মাস্ক)।
- 0.3 Drive-এ PDF কোন ফোল্ডার(গুলো)তে আছে, মোট ফাইল সংখ্যা ও মোট সাইজ (GB) — library sheet-এর `contentUrl` থেকে fileId তালিকা বানিয়ে মিলিয়ে দেখো। কোন fileId Drive-এ নেই (broken) সেটাও।
- 0.4 পুরো Spreadsheet-এর একটা XLSX কপি নামিয়ে `D:\Office Related Work\MC_Backup\2026-09-23\`-এ রাখো।
- 0.5 Oracle server-এর code কোথায় আছে (local ফোল্ডার/GitHub) খুঁজে দাও — না পেলে `ssh`-এ ঢুকে কোন ফোল্ডারে কী চলছে রিপোর্ট করো (কিছু বদলাবে না)।
- 0.6 রিপোর্ট দিয়ে থামো।

### Phase 1 — VPS-এ ফাইল স্টোরেজ ও sync (Day 2)
- `/data/mc-pdfs`, `/data/mc-backups` ফোল্ডার।
- rclone install; Google Drive remote (read-only scope `drive.readonly`), Saikat-এর Google account দিয়ে একবার OAuth (headless: `rclone authorize` Windows-এ চালিয়ে token কপি)।
- প্রথম পূর্ণ copy → ফাইল সংখ্যা ও সাইজ Phase 0-এর সাথে মেলাও।
- systemd timer / cron: প্রতি 6 ঘণ্টায় `rclone copy` (sync নয় — VPS থেকে কিছু মুছবে না)।
- ডিস্ক 70% ছাড়ালে Telegram alert।

### Phase 2 — VPS-এ watermark/file service (Day 3–4)
- Oracle server-এর একই API (`POST /download`, একই ফিল্ড) হুবহু রেখে নতুন `mc-files` container বানাও, `/root/smartqueue-stack`-এর Caddy-র পিছনে।
- Domain: sslip.io নয় — Saikat একটা subdomain দেবে (যেমন `files.sanvitools.in`); না পাওয়া পর্যন্ত `mc-187-127-191-163.sslip.io`।
- লজিক: local file আগে → না থাকলে Drive থেকে নামিয়ে cache → watermark।
- API key env-এ; পুরোনো key বাতিল করে নতুন key।
- Rate limit (প্রতি IP মিনিটে 20 request)।
- Load test: 20টা একসাথে download।

### Phase 3 — Frontend fallback chain (Day 5)
- `StudentLibrary.tsx`: `ORACLE_SERVER_URL` → env-চালিত তালিকা `[VPS, Oracle]`; প্রতিটায় 8s timeout; শেষে Drive `contentUrl`।
- Hardcoded key fallback মুছে ফেলো।
- Vercel env: `VITE_FILE_SERVERS`, `VITE_FILE_API_KEY`।
- টেস্ট: (ক) সব চালু (খ) VPS container বন্ধ করে (গ) VPS+Oracle দুটোই বন্ধ — তিন ক্ষেত্রেই PDF খোলে কিনা, স্ক্রিনশট।

### Phase 4 — Data backup ও নিরাপত্তা (Day 6–7)
- GAS time-trigger: রোজ 02:00 সব sheet → JSON → Drive `MC_Backups/YYYY-MM-DD/`; 30 দিনের পুরোনো মুছবে।
- VPS rclone সেটা `/data/mc-backups`-এ টানবে।
- doPost: action whitelist; admin-only function-এ login session token যাচাই (login-এর সময় server token দেবে, Sheet-এ hash রাখবে)।
- Frontend-এর static SECURITY_TOKEN সরাও।

### Phase 5 — Monitoring ও রক্ষণাবেক্ষণ (Day 8)
- Uptime Kuma (VPS): Vercel app, GAS URL, VPS files, Oracle — 5 মিনিট অন্তর, Telegram alert।
- সাপ্তাহিক রিপোর্ট (n8n): ডিস্ক, sync-এর শেষ সময়, backup-এর শেষ তারিখ।
- Oracle server: VPS 30 দিন স্থিতিশীল থাকলে তবেই বন্ধের সিদ্ধান্ত (Saikat নেবে)।

### Phase 6 — ডকুমেন্টেশন (প্রতি Phase শেষে + শেষে)
- CLAUDE.md নতুন করে লেখো: GAS+Sheets+Drive+VPS বাস্তবতা; Firebase quota অংশ "ঐতিহাসিক" করে নিচে সরাও।
- `RUNBOOK.md`: VPS down হলে কী করবে, key বদলাবে কীভাবে, restore কীভাবে।

---

## 5. নিষেধ (সব Phase-এ)
- কোনো secret/key/token রিপোর্টে বা git-এ print/commit করবে না।
- Live GAS deployment নতুন version-এ deploy করার আগে Saikat-এর অনুমতি নেবে।
- Drive থেকে কিছু মুছবে না। Sheet-এর data বদলাবে না (Phase 4-এর নিরাপত্তা বাদে)।
- Oracle server বন্ধ করবে না।
- `/root/smartqueue-stack`-এর চালু container (n8n, evolution-api) restart করার আগে জানাবে।

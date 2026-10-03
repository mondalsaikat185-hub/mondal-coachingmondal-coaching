# Step 1 — পড়ার কাজ VPS থেকে (Read path on Hostinger VPS)
> লেখক: Claude (planner/auditor) · 2026-09-24 · Executor: Antigravity
> শুধু যে সাব-ধাপ বলা হবে সেটাই করবে, তারপর থামবে ও রিপোর্ট দেবে।

## 0. পূর্বশর্ত
- StudentLibrary.tsx:1270 crash fix live হয়েছে, `npm run lint` = 0 error, Saikat ফোনে নিশ্চিত করেছে।

## 1. স্থায়ী নিয়ম (সব সাব-ধাপে)
1. Production = Vercel `main` + GAS deployment `AKfycbxBtl…` ("MAIN APP - DO NOT TOUCH")। এ দুটোতে Saikat-এর অনুমতি ছাড়া কিছু নয়। GAS production Version Saikat নিজে বদলায়।
2. প্রতি push-এর আগে `npm run lint` → 0 error। রিপোর্টে আউটপুট।
3. সব টেস্ট আগে Preview/test deployment-এ; Saikat ফোনে দেখে অনুমোদন দিলে তবেই production।
4. কোনো মাপ/টেস্ট বানানো বা ফর্মুলা দিয়ে লিখবে না — শুধু আসল আউটপুট।
5. secret/token রিপোর্টে পুরো লিখবে না (প্রথম 4 অক্ষর)।
6. `/root/smartqueue-stack`-এর চালু container (n8n, evolution-api, postgres, redis, caddy, mc-files) restart করার আগে জানাবে।
7. কোনো আসল student-এর account কখনো ব্যবহার করবে না। টেস্টের জন্য একটা স্থায়ী test student বানাও (নাম "TEST STUDENT - DO NOT DELETE", ফোন 9999999901, একটা আলাদা "TEST" batch)। আসল student-দের passcode পড়বে না, রিপোর্টে লিখবে না।

## 2. নকশা
```
লেখা (login, submit, payment, admin-এর সব বদল)  → আগের মতোই GAS + Google Sheet (source of truth)
পড়া (library, item details/quiz, batches, notifications, announcement) → VPS mc-api (দ্রুত)
                                                 ↳ VPS ব্যর্থ/ধীর (3s) হলে → GAS (আগের পথ)

Sync: GAS → VPS "push"
  - GAS function pushSnapshotToVps(): library (quizData সহ resolved), batches, notifications,
    announcement, settings-এর public অংশ → JSON → POST https://<mc-api>/sync  (HMAC secret header)
  - time trigger প্রতি 5 মিনিট + admin-এর লেখার function শেষে সঙ্গে সঙ্গে push (1B)
  - VPS প্রতিটা snapshot-এ version + সময় রাখে; GET response-এ `snapshotAge` দেয়
```
- **Step 1-এ ব্যক্তিগত ডেটা VPS-এ যাবে না**: users, payments, examResults, attendance, passcode — এগুলো GAS-এই থাকবে (নিরাপত্তা আসবে পরে)।
- **Exam sessions**: 1D-তে আলাদা, কড়া নিয়মে (নিচে)।

## 3. সাব-ধাপ
### 1A — VPS mc-api (frontend/GAS production-এ কোনো বদল নয়)
- `/root/smartqueue-stack/mc-api` container (Node/Express বা Python FastAPI), Caddy host `mc-api-187-127-191-163.sslip.io`।
- ডেটা: Postgres-এ নতুন database `mc` (বিদ্যমান postgres container, নতুন DB/ইউজার) — অথবা যুক্তি দেখিয়ে SQLite; রিপোর্টে কারণ লেখো।
- Endpoints: `POST /sync` (HMAC যাচাই, পুরো snapshot atomic replace), `GET /health`, `GET /library` (quizData ছাড়া, GAS apiGetLibrary-র হুবহু ফিল্ড), `GET /library/:id` (GAS apiGetLibraryItemDetails-এর হুবহু JSON), `GET /batches`, `GET /notifications`, `GET /announcement`।
- GAS: `pushSnapshotToVps()` নতুন function (প্রোজেক্টে যোগ, কিন্তু production Version বদলাবে না); Apps Script editor থেকে একবার হাতে চালাও; time-trigger এখনো নয়।
- প্রমাণ: প্রতিটা sheet-এর row সংখ্যা Sheet বনাম VPS; 5টা আলাদা itemId-এ `GET /library/:id` আর GAS apiGetLibraryItemDetails-এর JSON হুবহু এক কিনা (diff); প্রতিটা endpoint-এর response সময় (curl -w)।

### 1B — push-on-write + trigger
- admin-এর লেখার function (saveLibraryItem, delete*, shareLibraryItem, updateLibrarySequences, saveBatch/deleteBatch, create/deleteNotification, saveAnnouncement) শেষে `pushSnapshotToVps()` (ব্যর্থ হলে লেখাটা বাতিল হবে না — শুধু log)।
- 5-মিনিটের time-trigger।
- test deployment-এ টেস্ট: admin নোট যোগ → কত সেকেন্ডে VPS-এ দেখা যায়।

### 1C — Frontend Preview
- api.ts: উপরের read-গুলো আগে VPS (3s timeout) → ব্যর্থ হলে GAS। `snapshotAge` > 15 মিনিট হলে GAS।
- SWR cache আগের মতোই।
- Preview-এ Saikat ফোনে মাপবে: library, folder, পরীক্ষা খোলা, notification।

### 1D — Exam sessions (কড়া নিয়ম)
- create/end session-এর পরে push সঙ্গে সঙ্গে; পরীক্ষা খোলার সময় VPS sessions তখনই মানা হবে যদি `snapshotAge` < 60s, নইলে GAS।
- টেস্ট: live session শুরু → 5 সেকেন্ডের মধ্যে student code চায় কিনা।

### 1E — Production
- Saikat অনুমোদন দিলে: GAS production Version (Saikat নিজে) → Vercel main merge → live যাচাই।
- Rollback: Vercel আগের deployment promote; GAS আগের Version। VPS বন্ধ হলেও অ্যাপ GAS-এ চলবে।

# CLAUDE.md — M-C Tuition Application: Master AI Guide

> **READ THIS ENTIRE FILE BEFORE TOUCHING ANY CODE.**
> This is the single source of truth for every AI assistant working on this project.
> Violating any rule here will cause broken deployments, data inconsistency, or security issues.

---

## 🤝 AI Honesty Commitment (Saikat Mondal-এর সাথে চুক্তি)

> এই project-এ কাজ করার সময় AI-কে অবশ্যই এই নিয়মগুলো মানতে হবে:
>
> 1. **কখনো hallucinate করবে না।** যা নিশ্চিত না, সেটা "অনুমান" বলে mark করতে হবে।
> 2. **"মূল কারণ পেয়েছি" বলবে না** যদি সত্যিকারের diagnosis না করা হয়।
> 3. **Diagnose আগে, fix পরে।** Data দেখার আগে fix করতে যাওয়া নিষিদ্ধ।
> 4. **Pros এবং Cons দুটোই বলতে হবে** — শুধু ভালো দিক বললে চলবে না।
> 5. **"কাল ঠিক হবে" বলবে না** যদি নিশ্চিত না হওয়া যায়।
> 6. **সময় নষ্ট করবে না।** কাজ শেষ হওয়ার পরে কোনো ব্যাকগ্রাউন্ড স্ক্রিপ্ট ঝুলিয়ে রাখা যাবে না।

---

## 🎯 Project Identity & Current Production Stack

- **Application Name:** M-C Tuition Application (Mondal Coaching)
- **Owner / Developer:** Saikat Mondal (`mondal.saikat185@gmail.com`)
- **Git Repository:** `mondalsaikat185-hub/M-C-Tuition-App` (branch: `main`)
- **Production Web App (Vercel):** `https://mondal-coachingmondal-coaching.vercel.app`
- **Hostinger VPS:** `187.127.191.163` (Domain: `https://mc-187-127-191-163.sslip.io`)
- **Backend / Database:** Google Apps Script (GAS) Web App + Google Sheets (`M-C Tuition Database`)
- **File Storage:** Google Drive (`Tuition` folder + `Application Tuition App` folder)
- **PDF Watermark & Security Server:** `mc-files` Docker container on Hostinger VPS

---

## 🏫 What This Application Does

A **private tuition management and learning portal** for Saikat Mondal and his students in India.

### Core Features:
1. **Student Library** — Students access PDF study materials, notes, and exams assigned by the admin.
2. **Dynamic Watermarking & Phone Password Encryption** — PDFs downloaded by students are watermarked with student name & date via `mc-files` on VPS and encrypted with AES-256 using the student's phone number as the password.
3. **Resilient Fallback** — 10-second timeout on VPS requests; if VPS is down, client automatically falls back to direct Google Drive download (`item.contentUrl`).
4. **Live & Scheduled Exams** — Interactive exams (Bilingual MCQ, Cloze Test, Error Correction, Parajumble, Comprehension) handled by `UnifiedQuizPlayer.tsx`.
5. **Fee & Payment Tracking** — Admin records monthly tuition fees; students view their payment history.
6. **Attendance Tracking** — Recorded automatically during live exam sessions or classes.
7. **Broadcast Notifications** — Admin sends announcements to all students or specific batches.
8. **Admin Dashboard** — Full CRUD management over students, batches, library files, exams, results, payments, and settings.

---

## 🏗️ Modern System Architecture

```
[Student / Admin Browser]
        │
        ├── (UI & Static Assets) ────────► Vercel Hosting (Production)
        │
        ├── (Data API: Users, Exams, ─────► Google Apps Script (GAS Web App)
        │    Payments, Library Metadata)           │
        │                                          ▼
        │                                  Google Sheets DB
        │                                  ("M-C Tuition Database")
        │
        └── (Secure PDF Download) ────────► Hostinger VPS (mc-files via Caddy)
                     │                             │
                     ├─ (If VPS Down / 10s Timeout)├─► Local Storage /data/mc-pdfs
                     ▼                             └─► Authenticated rclone copyid
             Direct Google Drive Link                      from Google Drive
```

### Components:
1. **Frontend (Vercel):**
   - React 19 + TypeScript + Vite + Tailwind CSS v4.
   - PWA support via `vite-plugin-pwa`.
   - Auto-deployed on git push to `main` branch.
   - Env variables: `VITE_FILE_SERVER_URL` and `VITE_FILE_API_KEY`. (Strictly no hardcoded keys).

2. **Backend API (Google Apps Script):**
   - Headless Web App handling JSON RPC requests via `doPost`.
   - Actions mapped to Google Sheets rows with batching and auto-flush.
   - Script ID managed via `.clasp.json`.

3. **Database (Google Sheets):**
   - Spreadsheet: `M-C Tuition Database` (9 worksheets: `users`, `batches`, `library`, `payments`, `notifications`, `examSessions`, `attendance`, `examResults`, `settings`).

4. **File Server (Hostinger VPS `mc-files`):**
   - Containerized Python Flask service running inside Docker stack at `/root/smartqueue-stack`.
   - Protected by reverse-proxy Caddy with automatic SSL (`mc-187-127-191-163.sslip.io`).
   - High performance: local index lookup (`/data/mc-pdfs/index.json`) serves watermarked & encrypted PDFs in <0.3s.
   - Fallback mechanism: authenticated `rclone backend copyid drive: <fileId> /data/mc-pdfs/_cache/`.
   - Rate limit: 60 requests/minute per IP.

5. **Automated VPS Maintenance & Backups (Cron):**
   - `0 */6 * * * /root/sync_pdfs.sh` — Syncs Drive PDFs to `/data/mc-pdfs` and regenerates `index.json`.
   - `30 20 * * * /root/backup_sheet.sh` — Exports Google Sheet database as XLSX to `/data/mc-backups/YYYY-MM-DD/` daily at 02:00 IST (20:30 UTC); automatically purges backups older than 30 days.
   - `0 * * * * /root/check_disk.sh` — Hourly disk space safety monitor.

---

## 🔐 Security Architecture & Session Management

- **Session Tokens:** 30-day cryptographically secure SHA-256 tokens stored in `sessions` sheet with 6-hour `CacheService` in-memory lookup.
- **Role Scoping:** Server-side scoping enforces students can only fetch their own payments, attendance, and exam results (`studentId === session.userId`).
- **Anti-Spoofing:** All critical endpoints verify student identity server-side from session token.
- **Rate Limiting:** `apiSendOTP` is capped at 3 attempts per 15 minutes per phone number via `CacheService`.
- **Session Revocation:** On user status update (e.g. suspended), user deletion, or batch reassignment, all active sessions for that user are immediately purged from both cache and sheet.

> [!IMPORTANT]
> **TODO: Passcode Hashing Migration (Deferred):**
> Passcode hashing is intentionally deferred in Phase 4B. Currently, 90+ student accounts in Google Sheets have plain-text passcodes (often defaulting to clean phone numbers). Hashing existing passcodes immediately without a gradual migration strategy would lock out all existing students.
> **Planned Future Implementation:** Implement a transparent "hash-on-login" migration:
> 1. When a user logs in, test against the existing plain-text/phone fallback.
> 2. Once verified, compute a modern cryptographic hash (e.g., bcrypt/scrypt/PBKDF2) and store it in the database with a `passcodeHash` column.
> 3. Subsequent logins verify against the hash. Once all active users have logged in over a 60-day cycle, remove plain-text passcodes permanently.

---

## ⚛️ React & Frontend Coding Rules (Strict)

1. **Strict React Keys:**
   - **ALWAYS** use unique entity `id` (e.g., `key={item.id}`, `key={payment.id}`).
   - **NEVER** use array index as key (`key={index}` is strictly **FORBIDDEN**).
   - **NEVER** append index to unique IDs (`key={`${item.id}-${index}`}` is **FORBIDDEN**).
2. **Hook Execution Order:**
   - **NEVER** return early before all React hooks (`useState`, `useEffect`, `useRef`, `useMemo`, `useCallback`) are declared.
   - Conditional early returns must appear strictly AFTER all hooks.
3. **Prevent useEffect Infinite Loops:**
   - Never place state objects updated within an effect directly inside its own dependency array. Use `useRef` for cached references.
4. **Error Boundaries:**
   - All critical views and the app root must be wrapped in `ErrorBoundary.tsx`.

---

## 🗣️ Communication Rule — MANDATORY (বাংলা)

> **After completing ANY task, you MUST communicate and explain everything to the user in Bengali (বাংলা).**
>
> The user is Saikat Mondal from India.
> All explanations, progress updates, bug diagnoses, and questions must be written in Bengali.
> Technical keywords (e.g. `Vercel`, `VPS`, `rclone`, `GAS`, `Docker`, `timeout`) can remain in English within Bengali sentences.
> Example: "আমি VPS-এ ব্যাকআপ স্ক্রিপ্ট সেট করেছি এবং ভেরিফিকেশন সফল হয়েছে।"

---

## 🏛️ ঐতিহাসিক — আর ব্যবহার হয় না (Historical — No Longer In Use: Firebase Archive)

> [!NOTE]
> The project originally operated on **Firebase Firestore (Spark Free Tier 50k reads/day)** and **Firebase Hosting** with an Oracle Cloud free tier VPS. Due to daily quota exhaustion, slow cold starts, and Oracle network restrictions, the entire stack was migrated in 2026 to:
> - **Vercel** for hosting.
> - **Google Sheets + Google Apps Script** for relational database and backend API.
> - **Hostinger VPS (`mc-files`)** for PDF watermarking and 256-bit AES encryption.
> 
> *The rules below are preserved for historical reference and context only:*
> - *Old Firestore collections: `users`, `admins`, `batches`, `library`, `batchAssignments`, `payments`, `notifications`, `examSessions`, `attendance`, `libraryChunks`.*
> - *Old 50k read limits required `cachedGetDocs` with 15-minute TTL, strict query limits, and banning `onSnapshot` on student accounts.*
> - *Old Oracle VPS: `saikat-tuition.duckdns.org` running `pdfserver.service`.*

# Production Deployment Runbook: Security & Payment Release
**Target Branch:** `security-sessions` ➔ `main`  
**Target GAS Release:** Version 62 (Live Deployment Edit)  
**Target Vercel Release:** Production Build (Manual Promote)  
**Date:** September 2026  

---

> ⚠️ **গুরুত্বপূর্ণ সতর্কতা:**  
> এই নির্দেশিকাটি প্রোডাকশন রিলিজের জন্য প্রস্তুত। Saikat-এর স্পষ্ট অনুমোদন ছাড়া প্রোডাকশনে এখনই কোনো পুশ বা ডিপ্লয় করবেন না।

---

## ⚠️ কেন ডিপ্লয়মেন্ট ক্রম জরুরি — "401 ব্ল্যাকআউট" সমস্যা

এই রিলিজে GAS ব্যাকএন্ডে **session token** বাধ্যতামূলক করা হচ্ছে। পুরোনো frontend (Version 59) কোনো session token পাঠায় না।

**ভুল ক্রম (GAS আগে → Vercel পরে) কী ঘটাবে:**
1. GAS Version 62 লাইভ হওয়া মাত্র `ACTIONS_NEEDING_SESSION`-এ থাকা **সমস্ত** API কল-এ session token দরকার হবে
2. পুরোনো frontend (Vercel-এ তখনও পুরোনো বিল্ড) session token পাঠায় না
3. **ফল → পুরো অ্যাপ 401 Unauthorized, সব ব্যবহারকারী লক-আউট**
4. Vercel বিল্ড সাধারণত ২-৪ মিনিট লাগে — এই পুরো সময়টা অ্যাপ অচল থাকবে

**সঠিক ক্রম:** Vercel-এর নতুন বিল্ড **আগে তৈরি করে রাখো** (promote না করে) → GAS deploy → **সঙ্গে সঙ্গে** Vercel promote। লক্ষ্য: GAS → Vercel promote-এর মধ্যে **< ২ মিনিট**।

---

## ১. ডিপ্লয়মেন্টের পূর্বপ্রস্তুতি (Pre-Deploy)

### ক) ডাটাবেস ব্যাকআপ (VPS)
ডিপ্লয়মেন্ট শুরুর ঠিক আগে একটি তাজা স্ন্যাপশট নিন:

```bash
ssh root@187.127.191.163
/root/backup_sheet.sh
ls -lh /data/mc-backups/$(date +%Y-%m-%d)/
# ফাইল সাইজ ~৪.১ MB ও এক্সটেনশন .xlsx নিশ্চিত করুন
```

### খ) Vercel বিল্ড তৈরি করে রাখা (Stage, Promote না করা)

**পদ্ধতি — Vercel "Promote to Production":**

1. **`security-sessions` ব্রাঞ্চকে `main`-এ merge করুন ও push করুন:**
   ```bash
   git checkout main
   git merge security-sessions
   git push origin main
   ```
   
2. **⚡ Vercel Auto-Deploy বন্ধ রাখুন (ম্যানুয়াল প্রমোট):**
   - Vercel Dashboard → Project Settings → **Git** → **Production Branch** → নিশ্চিত করুন `main` সেট আছে
   - কিন্তু deploy তাৎক্ষণিক হলে, এটি ব্যবহার করুন:
     - **Vercel Dashboard → Deployments ট্যাবে** নতুন বিল্ড দেখা গেলে, সেটার URL-এ গিয়ে ভেরিফাই করুন (Preview URL)
     - **এখনও Promote করবেন না!** — আগে GAS deploy হতে দিন (ধাপ ২ দেখুন)

   **বিকল্প পদ্ধতি (যদি auto-deploy বন্ধ করতে চান):**
   - Vercel Dashboard → Project Settings → Git → **Ignored Build Step** ফিল্ডে `exit 0` লিখুন (সাময়িক)
   - তারপর push করুন, Vercel বিল্ড skip করবে
   - GAS deploy হওয়ার পর → Vercel Dashboard → Deployments → **Redeploy** বোতাম চাপুন
   - অথবা Ignored Build Step ফিল্ড খালি করে **Redeploy** চাপুন

3. **Preview URL-এ যাচাই করুন** যে নতুন frontend ঠিকমতো লোড হচ্ছে (login screen আসছে)।

---

## ২. ডিপ্লয়মেন্টের সঠিক ক্রম (Critical Sequence)

| ধাপ | সময় | অ্যাকশন |
|---|---|---|
| **ধাপ ১** | T+0 | Vercel বিল্ড তৈরি ও Preview URL যাচাই (ধাপ ১.খ সম্পন্ন) |
| **ধাপ ২** | T+0 | GAS কোড push (`clasp push`) |
| **ধাপ ৩** | T+30s | GAS Live Deployment Edit → **Version 62** |
| **ধাপ ৪** | T+60s | **সঙ্গে সঙ্গে** Vercel Promote to Production |
| **লক্ষ্য** | — | ধাপ ৩ → ধাপ ৪ এর মধ্যে **< ২ মিনিট** |

### ⏱️ মাঝের উইন্ডোতে কী হবে? (ধাপ ৩ → ৪)
- GAS v62 লাইভ কিন্তু Vercel-এ তখনও পুরোনো frontend
- পুরোনো frontend session token পাঠায় না → **authenticated API কল 401 দেবে**
- **প্রভাব:** ইতিমধ্যে লগইন-করা ব্যবহারকারীরা কোনো ডেটা লোড করতে পারবে না, নতুন লগইনও ব্যর্থ হবে
- **সমাধান:** এই উইন্ডো যত ছোট ততই ভালো — তাই Vercel promote **একেবারে সঙ্গে সঙ্গে** করতে হবে
- **আদর্শ সময়:** রাত ১-৩টা (ভারতীয় সময়), যখন ব্যবহারকারী সবচেয়ে কম

---

## ৩. Google Apps Script লাইভ ডিপ্লয়মেন্ট নির্দেশিকা

> 🛑 **সতর্কতা: কখনো "New Deployment" তৈরি করবেন না! শুধুমাত্র বিদ্যমান Live Deployment "Edit" করবেন।**

1. GAS প্রজেক্টে কোড push করুন:
   ```bash
   cd gas-backend-live
   npx @google/clasp push
   ```

2. Apps Script ব্রাউজার ট্যাবে:
   - **Deploy** বোতাম → **Manage deployments**
   - Live Web App deployment নির্বাচন করুন  
     (`Deployment ID: AKfy...rQJ`)
   - **Edit (পেন্সিল আইকন)** ক্লিক করুন
   - **Version** ড্রপডাউনে **New version** নির্বাচন করুন (Version 62)
   - বিবরণ: `Production: Phase 4B Session Security + Student Payment Request`
   - **Deploy** ক্লিক করুন

3. ✅ Live URL অপরিবর্তিত আছে যাচাই করুন:
   `https://script.google.com/macros/s/AKfy...rQJ/exec`

4. **⚡ এখন সঙ্গে সঙ্গে ধাপ ৪-এ যান!**

---

## ৪. Vercel Promote to Production (তাৎক্ষণিক)

GAS deploy-এর **সঙ্গে সঙ্গে** (< ২ মিনিটের মধ্যে):

1. Vercel Dashboard → **Deployments** ট্যাবে যান
2. ধাপ ১.খ-তে তৈরি করা নতুন বিল্ড চিহ্নিত করুন (Preview/Staged status)
3. ডানদিকের তিন ডট মেনু (`...`) → **Promote to Production** ক্লিক করুন
4. Vercel তাৎক্ষণিকভাবে ট্রাফিক নতুন বিল্ডে সুইচ করবে (< ১০ সেকেন্ড)

---

## ৫. PWA / Service Worker: Stale Cache সমস্যা নেই ✅

### বর্তমান কনফিগারেশন (vite.config.ts):
```typescript
VitePWA({
  selfDestroying: true,     // ← SW নিজেকে unregister করে!
  registerType: 'autoUpdate',
  workbox: {
    cleanupOutdatedCaches: true,
    skipWaiting: true,
    clientsClaim: true
  }
})
```

### কেন stale cache সমস্যা হবে না:

- **`selfDestroying: true`**: এই ফ্ল্যাগ vite-plugin-pwa-কে এমন একটি SW generate করতে বলে যা install হওয়া মাত্র নিজেকে **unregister** করে এবং সমস্ত cache মুছে দেয়। ফলে কোনো SW ক্যাশিং কার্যকর থাকে না।
- **`ReloadPrompt` কম্পোনেন্ট** (`src/components/ReloadPrompt.tsx`): `useRegisterSW` hook ব্যবহার করে নতুন version detect করলে "নতুন আপডেট পাওয়া গেছে!" ব্যানার দেখায়। ব্যবহারকারী "Update / Reload" চাপলে তাৎক্ষণিকভাবে নতুন version লোড হয়।
- **কোনো cache-busting বা SW invalidation দরকার নেই** — `selfDestroying` ইতিমধ্যে সব সামলাচ্ছে।

### ⚠️ সতর্কতা: ব্রাউজার ক্যাশ
- Vercel CDN ডিফল্টভাবে `Cache-Control: no-cache` বা ছোট TTL দেয় — সাধারণত সমস্যা হয় না
- কিন্তু যদি কোনো ব্যবহারকারীর ব্রাউজার পুরোনো HTML ধরে রাখে, তারা হয়তো একটা hard refresh (Ctrl+Shift+R) দিতে পারে

---

## ৬. জরুরী রোলব্যাক পদ্ধতি (Emergency Rollback)

### রোলব্যাকের ক্রম: **Vercel আগে → তারপর GAS**
> (Deploy-এর বিপরীত ক্রম! পুরোনো frontend + পুরোনো GAS = কাজ করে। পুরোনো frontend + নতুন GAS = 401)

#### ক) Vercel Rollback (< ১ মিনিট):
1. Vercel Dashboard → **Deployments** ট্যাব
2. আজকের deploy-এর **আগের** সফল production deployment চিহ্নিত করুন
3. তিন ডট মেনু (`...`) → **Promote to Production**
4. তাৎক্ষণিকভাবে পুরোনো frontend লাইভ

#### খ) GAS Rollback (< ১৫ সেকেন্ড):
1. Apps Script → **Deploy** → **Manage deployments**
2. Live Web App নির্বাচন → **Edit (পেন্সিল আইকন)**
3. Version ড্রপডাউন → পূর্ববর্তী স্থিতিশীল **Version 59** নির্বাচন
4. **Deploy** → তাৎক্ষণিকভাবে Version 59-এ ফিরে যাবে

#### গ) Session ডেটা Cleanup (রোলব্যাকের পর):
- Version 62-তে তৈরি হওয়া session rows (sessions sheet) পুরোনো GAS-এ অপ্রাসঙ্গিক — ক্ষতি নেই, তবে চাইলে মুছে দেওয়া যায়

---

## ৭. ডিপ্লয়-পরবর্তী যাচাই তালিকা (Post-Deploy Checklist)

প্রোডাকশন লাইভ হওয়ার ৫ মিনিটের মধ্যে নিম্নোক্ত ৫টি বিষয় যাচাই করুন:

- [ ] **১. Admin Login ও ইউজার লোডিং:**
  - Admin ফোন `9432****` / passcode দিয়ে লগইন
  - Dashboard-এ শিক্ষার্থী তালিকা সঠিকভাবে লোড হচ্ছে কিনা দেখুন

- [ ] **২. Student Login ও সেশন নিরাপত্তা:**
  - একজন আসল শিক্ষার্থীর ফোন ও পাসকোড দিয়ে লগইন
  - Dashboard ও Announcements সঠিকভাবে আসছে কিনা দেখুন

- [ ] **৩. নিরাপদ PDF লাইব্রেরি ও VPS ডাউনলোড:**
  - শিক্ষার্থী অ্যাকাউন্ট → Library → যেকোনো PDF-এ ক্লিক
  - PDF ডাউনলোড ও ওয়াটারমার্ক যাচাই

- [ ] **৪. নতুন পেমেন্ট রিকোয়েস্ট প্রবাহ:**
  - শিক্ষার্থী প্যানেল → **Fees & Payments**
  - UPI নির্বাচন → QR কোড ও UPI কপি কাজ করছে কিনা
  - ফি নির্বাচন → **"পেমেন্ট রিকোয়েস্ট পাঠান"** → হিস্ট্রিতে **"Pending Review"** দেখাচ্ছে কিনা

- [ ] **৫. Admin Payment অনুমোদন/বাতিল:**
  - Admin প্যানেল → Payments Management
  - Pending request-এ **Approve** বা **Reject** (কারণসহ)
  - শিক্ষার্থী প্যানেলে রিফ্রেশ করে ফলাফল দেখুন

---

## ৮. Vercel Environment Variables (চেকলিস্ট)

Vercel Dashboard → Project → Settings → Environment Variables-এ নিশ্চিত করুন:

| Variable | Value |
|---|---|
| `VITE_GAS_WEB_APP_URL` | `https://script.google.com/macros/s/AKfy...rQJ/exec` |
| `VITE_FILE_SERVER_URL` | `https://mc-187-127-191-163.sslip.io` |
| `VITE_FILE_API_KEY` | `c564...bcec****` |

---

## ৯. নিরাপত্তা নীতি (টোকেন ও পাসওয়ার্ড)

- কোনো রিপোর্ট, লগ, বা AI আউটপুটে passcode, password, বা token-এর পুরোটা প্রকাশ করবেন না
- **শুধুমাত্র প্রথম ৪ অক্ষর** দেখানো যাবে, বাকি `****` দিয়ে ঢাকা থাকবে
- উদাহরণ: `saik****`, `c564****`, `AKfy...rQJ`

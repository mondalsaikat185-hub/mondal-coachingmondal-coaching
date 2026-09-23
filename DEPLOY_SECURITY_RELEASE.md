# Production Deployment Runbook: Security & Payment Release
**Target Branch:** `security-sessions` ➔ `main`  
**Target GAS Release:** Version 62 (Live Deployment Edit)  
**Target Vercel Release:** Production Auto-Build on `main`  
**Date:** September 2026  

---

> ⚠️ **গুরুত্বপূর্ণ সতর্কতা:**  
> এই নির্দেশিকাটি প্রোডাকশন রিলিজের জন্য প্রস্তুত। Saikat-এর স্পষ্ট অনুমোদন ছাড়া প্রোডাকশনে এখনই কোনো পুশ বা ডিপ্লয় করবেন না।

---

## ১. ডিপ্লয়মেন্টের ঠিক পূর্বের প্রস্তুতি (Pre-Deploy Backup)

ডিপ্লয়মেন্ট শুরু করার ঠিক ১ মিনিট আগে Hostinger VPS-এ একটি তাজা ডেটাবেস স্ন্যাপশট নিতে হবে:

1. SSH দিয়ে VPS-এ প্রবেশ করুন:
   ```bash
   ssh root@187.127.191.163
   ```
2. ব্যাকআপ স্ক্রিপ্টটি চালান:
   ```bash
   /root/backup_sheet.sh
   ```
3. ব্যাকআপ ফাইল যাচাই করুন:
   ```bash
   ls -lh /data/mc-backups/$(date +%Y-%m-%d)/
   ```
   *ফাইল সাইজ ~৪.১ MB এবং এক্সটেনশন `.xlsx` নিশ্চিত করুন।*

---

## ২. ডিপ্লয়মেন্টের সঠিক ক্রম ও উইন্ডো অ্যানালিসিস (Order of Deployment)

### 📌 ক্রম: **GAS আগে ➔ তারপর Vercel**

| ধাপ | উপাদান | অ্যাকশন | আনুমানিক সময় |
|---|---|---|---|
| **ধাপ ১** | **Google Apps Script** | Live Deployment এডিট করে নতুন **Version 62** নির্ধারণ | ৩০ সেকেন্ড |
| **ধাপ ২** | **Git & Vercel** | `security-sessions` ব্রাঞ্চ `main`-এ মার্জ ও পুশ | ২ মিনিট |

### 🔍 মাঝের ২-৩ মিনিটে কী প্রভাব পড়বে? (Intermediary Window Analysis)
- **কেন Vercel আগে নয়?**  
  Vercel আগে ডিপ্লয় হলে নতুন কোড সার্ভারে `apiSubmitPaymentRequest` ডাকবে। GAS তখনও পুরানো Version 59 থাকলে সেই মেথড চিনতে না পেরে `404 Invalid Action` দেবে।
- **GAS আগে ডিপ্লয় হলে কী হবে?**  
  GAS আগে Version 62 হলে ব্যাকএন্ড backward-compatible থাকবে। লগইন, পাসকোড, লাইব্রেরি স্বাভাবিক চলবে। শুধুমাত্র কোনো অ্যাডমিন যদি ওই ২ মিনিটে পুরানো অফলাইন বোতাম চেপে পেমেন্ট যোগ করার চেষ্টা করেন, তবে সার্ভার তাকে `403` দিয়ে আটকে দেবে (যা আমাদের নতুন মূলনীতির সাথেই সামঞ্জস্যপূর্ণ)।

---

## ৩. Google Apps Script লাইভ ডিপ্লয়মেন্ট নির্দেশিকা

> 🛑 **সতর্কতা: কখনো "New Deployment" তৈরি করবেন না! শুধুমাত্র বিদ্যমান Live Deployment "Edit" করবেন, যাতে Web App URL অপরিবর্তিত থাকে।**

1. Google Apps Script প্রজেক্ট কনসোলে যান (`scriptId: 1bvnK67cVsfzuk2Sos5F90ySCy3OV1NATajf1E778A8ggHJqUV9rPliVT`)।
2. কোড `@HEAD`-এ আপডেট করতে clasp ব্যবহার করুন:
   ```bash
   npx @google/clasp push
   ```
3. Apps Script ব্রাউজার ট্যাবে:
   - উপরে ডানদিকের নীল **Deploy** বোতামে ক্লিক করুন ➔ **Manage deployments** নির্বাচন করুন।
   - বামদিকের তালিকা থেকে অ্যাক্টিভ **Web App** ডিপ্লয়মেন্টটি নির্বাচন করুন (`Deployment ID: AKfycbyyssI3GSo8eTfiRg9kVMXuc7chdvYuSN78K5lKRrQJ`)।
   - উপরের পেন্সিল আইকনে (**Edit**) ক্লিক করুন।
   - **Version** ড্রপডাউনে **New version** নির্বাচন করুন (এটি স্বয়ংক্রিয়ভাবে **Version 62** হবে)।
   - বিবরণ দিন: `Production Release: Phase 4B Security Sessions + Student Payment Request Flow`
   - নিচে ডানদিকের নীল **Deploy** বোতামে ক্লিক করুন।
4. নিশ্চিত হোন লাইভ URL অপরিবর্তিত আছে:  
   `https://script.google.com/macros/s/AKfycbyyssI3GSo8eTfiRg9kVMXuc7chdvYuSN78K5lKRrQJ/exec`

---

## ৪. Vercel ডিপ্লয়মেন্ট নির্দেশিকা

1. লোকাল পিসিতে গিট ব্রাঞ্চ মার্জ করুন:
   ```bash
   git checkout main
   git merge security-sessions
   git push origin main
   ```
2. Vercel Dashboard-এ Environment Variables যাচাই করুন:
   - `VITE_GAS_WEB_APP_URL` = `https://script.google.com/macros/s/AKfycbyyssI3GSo8eTfiRg9kVMXuc7chdvYuSN78K5lKRrQJ/exec`
   - `VITE_FILE_SERVER_URL` = `https://mc-187-127-191-163.sslip.io`
   - `VITE_FILE_API_KEY` = `c56403e4cd94d0d57af25e09aaf8e64d06ae74bcec841243`
3. Vercel স্বয়ংক্রিয়ভাবে নতুন বিল্ড তৈরি করে প্রোডাকশনে রোল-আউট করবে।

---

## ৫. জরুরী রোলব্যাক পদ্ধতি (Rollback Procedure)

যদি ডিপ্লয়মেন্টের পর কোনো অপ্রত্যাশিত সমস্যা দেখা দেয়, তবে অনতিবিলম্বে নিম্নোক্ত উপায়ে পূর্ববর্তী অবস্থায় ফিরে যান:

### ক) Google Apps Script Rollback (< ১৫ সেকেন্ড):
1. Apps Script এ যান ➔ **Deploy** ➔ **Manage deployments**।
2. Live Web App নির্বাচন করে **Edit (পেন্সিল আইকন)** চাপুন।
3. Version ড্রপডাউন থেকে পূর্ববর্তী স্থিতিশীল **Version 59** নির্বাচন করুন।
4. **Deploy** চাপুন। তাৎক্ষণিকভাবে লাইভ ব্যাকএন্ড Version 59-এ ফিরে যাবে।

### খ) Vercel Rollback (< ১ মিনিট):
1. Vercel Dashboard ➔ **Deployments** ট্যাবে যান।
2. আজকের ডিপ্লয়মেন্টের আগের সফল প্রোডাকশন ডিপ্লয়মেন্টটি চিহ্নিত করুন।
3. ডানদিকের তিন ডট মেনু (`...`) থেকে **Promote to Production** ক্লিক করুন।
4. তাৎক্ষণিকভাবে ট্রাফিক পূর্ববর্তী ফ্রন্টএন্ডে রুট হবে।

---

## ৬. ডিপ্লয় পরবর্তী ৫ মিনিটের পোস্ট-ডিপ্লয় যাচাই তালিকা (Post-Deploy Checklist)

প্রোডাকশন লাইভ হওয়ার পর নিম্নোক্ত ৫টি বিষয় ব্রাউজারে যাচাই করুন:

- [ ] **১. Admin Login ও ইউজার লোডিং:**
  - `9432490498` / `saikat123` দিয়ে লগইন করুন।
  - Admin Dashboard-এ গিয়ে শিক্ষার্থীদের তালিকা সঠিকভাবে লোড হচ্ছে কিনা দেখুন।
- [ ] **২. Student Login ও সেশন নিরাপত্তা:**
  - একজন আসল শিক্ষার্থীর ফোন ও পাসকোড দিয়ে লগইন করুন।
  - Dashboard ও Announcements সঠিকভাবে আসছে কিনা দেখুন।
- [ ] **৩. নিরাপদ PDF লাইব্রেরি ও VPS ডাউনলোড:**
  - শিক্ষার্থীর অ্যাকাউন্ট থেকে Library মডিউলে যান এবং যেকোনো একটি স্টাডি মেটেরিয়াল PDF-এ ক্লিক করুন।
  - PDF ডাউনলোড হওয়ার পর শিক্ষার্থীর ফোন নম্বর দিয়ে ওপেন করুন এবং পৃষ্ঠায় ওয়াটারমার্ক যাচাই করুন।
- [ ] **৪. নতুন পেমেন্ট রিকোয়েস্ট প্রবাহ:**
  - শিক্ষার্থী প্যানেলে **Fees & Payments**-এ যান।
  - "কীভাবে ফি দিলেন?" অপশন থেকে **UPI** নির্বাচন করে QR কোড ও UPI কপি কাজ করছে কিনা দেখুন।
  - একটি মাসের ফি নির্বাচন করে **"পেমেন্ট রিকোয়েস্ট পাঠান"** চাপুন। হিস্ট্রিতে স্ট্যাটাস **"Pending Review"** দেখাচ্ছে কিনা নিশ্চিত করুন।
- [ ] **৫. Admin Payment অনুমোদন ও বাতিল যাচাই:**
  - Admin প্যানেলে যান ➔ Payments Management।
  - শিক্ষার্থীর পেন্ডিং রিকোয়েস্টটিতে **Approve** ক্লিক করে অনুমোদন করুন অথবা **Reject** ক্লিক করে কারণসহ বাতিল করুন।
  - শিক্ষার্থী প্যানেলে রিফ্রেশ করে Approved বা Rejection Reason প্রদর্শিত হচ্ছে কিনা দেখুন।

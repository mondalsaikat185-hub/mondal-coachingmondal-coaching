# Google Sheets Database Template

গুগল স্প্রেডশিটকে ডেটাবেস হিসেবে ব্যবহার করার জন্য আপনাকে একটি নতুন গুগল শিট (Google Sheet) তৈরি করতে হবে এবং সেখানে নিচে দেওয়া নাম অনুযায়ী আলাদা আলাদা শিট (Tab) ও কলাম হেডার (Headers) তৈরি করতে হবে।

> [!IMPORTANT]
> শিটের নাম (Sheet Names) এবং প্রথম লাইনের কলাম হেডারগুলো (Column Headers) হুবহু নিচে দেওয়া বানান ও ক্যাপিটালাইজেশন অনুযায়ী হতে হবে। কোনো অতিরিক্ত স্পেস বা বানান ভুল থাকা যাবে না।

---

## 📋 শিট ও কলাম হেডারগুলোর তালিকা:

### ১. `users` (স্টুডেন্ট ও অ্যাডমিন ইউজাররা)
এই শিটে স্টুডেন্ট এবং অ্যাডমিনদের প্রোফাইল থাকবে।
* **কলাম হেডার (Row 1):**
  `id` | `name` | `phone` | `email` | `role` | `status` | `batchId` | `createdAt` | `updatedAt` | `reapplyReason` | `paymentStatus` | `passcode`

### ২. `batches` (স্টুডেন্ট ব্যাচসমূহ)
স্টুডেন্টদের বিভিন্ন ব্যাচ গ্রুপ।
* **কলাম হেডার (Row 1):**
  `id` | `name` | `assignedItemsMap` | `createdAt`

### ③. `library` (স্টুডেন্ট লাইব্রেরি আইটেম)
পিডিএফ নোট এবং পরীক্ষার ফোল্ডার/আইটেমসমূহ।
* **কলাম হেডার (Row 1):**
  `id` | `title` | `type` | `parentId` | `contentUrl` | `isEncrypted` | `encryptionPassword` | `quizId` | `createdAt` | `isFolder` | `fileName` | `isChunked` | `chunkCount`

### ৪. `payments` (পেমেন্ট রেকর্ড)
স্টুডেন্টদের মাসিক পেমেন্ট হিস্ট্রি।
* **কলাম হেডার (Row 1):**
  `id` | `studentId` | `month` | `amount` | `status` | `transactionId` | `paidDate` | `createdAt`

### ৫. `notifications` (নোটিফিকেশন ও ঘোষণা)
অ্যাডমিন নোটিশবোর্ড মেসেজ।
* **কলাম হেডার (Row 1):**
  `id` | `title` | `message` | `batchId` | `senderId` | `createdAt`

### ৬. `examSessions` (লাইভ পরীক্ষার সেশনসমূহ)
পরীক্ষার জন্য তৈরি হওয়া সেশন।
* **কলাম হেডার (Row 1):**
  `id` | `examId` | `batchId` | `code` | `isActive` | `codeEnabled` | `participantUids` | `createdAt`

### ৭. `attendance` (উপস্থিতি রেকর্ড)
পরীক্ষার সময় নেওয়া অটো-অ্যাটেনডেন্স।
* **কলাম হেডার (Row 1):**
  `id` | `sessionId` | `studentId` | `studentName` | `studentPhone` | `joinedTime` | `createdAt`

### ৮. `examResults` (পরীক্ষার ফলাফল)
কুইজ পরীক্ষা দেওয়ার পর সাবমিট হওয়া ফলাফল।
* **কলাম হেডার (Row 1):**
  `id` | `examId` | `studentId` | `studentName` | `score` | `totalQuestions` | `answersJSON` | `submittedAt`

---

## 🛠️ স্প্রেডশিট আইডি (Spreadsheet ID) কোথায় পাবেন:
আপনি যখন নতুন গুগল শিট তৈরি করবেন, তখন ব্রাউজারের ইউআরএল বারের দিকে তাকান:
`https://docs.google.com/spreadsheets/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890/edit#gid=0`

এখানে `/d/` এবং `/edit` এর মাঝের অংশটিই হলো আপনার **Spreadsheet ID** (যেমন উপরের উদাহরণে: `1aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890`)। এই আইডিটি আমাদের `Code.gs` ফাইলে যুক্ত করতে হবে।

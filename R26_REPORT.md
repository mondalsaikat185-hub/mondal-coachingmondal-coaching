# ROUND R26 REPORT — নোট ↔ Exam স্থায়ী লিংক (Production Deployment)

**Date**: 2026-10-05T17:22:00+05:30  
**Branch**: `payments-upi`  
**Status**: ধাপ ১ থেকে ৬ সম্পূর্ণ সম্পন্ন এবং লাইভ প্রোডাকশনে সফলভাবে ভেরিফাইড।

---

## ১. ওভারভিউ (Overview)

- **টাস্ক**: `TASK_R26_NOTE_EXAM_LINK.md`
- **অনুমোদন**: `R26_APPROVAL.md` (SLST Education Unit 1-10 → `noExamNeeded: true`, Physics তড়িৎ প্রবাহ লিংক বহাল, Idioms 601-700 বাদ দিয়ে বাকি সব লিংক সম্পন্ন)।
- **মূল সমস্যা**: fuzzy guessing-এর কারণে অ্যাডমিনের সতর্কতা স্প্যাম ("02-notto-shotto-bidhan — নোটের কোনো exam নেই") আসছিল, অথচ একই ফোল্ডারে exam ছিল।
- **সমাধান**: অনুমান বাদ দিয়ে ডাটাবেসে প্রতিটি নোটে স্থায়ী ফিল্ড `linkedExamIds` (array) এবং `noExamNeeded` (boolean) বসানো হয়েছে। সার্ভার এবং অ্যাডমিন UI সম্পূর্ণরূপে আপডেট করা হয়েছে।

---

## ২. লাইভ ডাটাবেস মাইগ্রেশন (Live VPS Database Migration)

### ক. ব্যাকআপ ও লাইভ অটো-লিংক (`tools/link_notes_exams.mjs --apply`)
- **Host Backup**: `/root/smartqueue-stack/mc-api-v2/data/mc2-pre-r26-host.db` (23MB)
- **Live VACUUM Backup**: `/data/mc2-pre-link-1791198710014.db`
- **একক ট্রানজ্যাকশন**: 280টি নোট আপডেট সম্পন্ন।
- **Row Count যাচাই**: মাইগ্রেশনের আগে = 2768, মাইগ্রেশনের পরে = 2768 (সঠিক)।

```text
================================================================================
DATABASE: /data/mc2.db
MODE: APPLY (Writing to database)
TOTAL NOTES: 280
MATCHED: 276 (261 linked + 15 noExamNeeded)
UNMATCHED: 4 (Idioms 601-625, 626-650, 651-675, 676-700 — R25-এর জন্য সংরক্ষিত)
SUSPICIOUS: 0
================================================================================
✓ Single transaction committed successfully.
✓ Row count verified: Before=2768, After=2768.
```

### খ. পুরোনো অ্যাডমিন সতর্কতা পরিষ্কার (`tools/clean_alerts.mjs`)
- **VACUUM Backup**: `/data/mc2-pre-clean-alerts-1791200693757.db`
- **একক ট্রানজ্যাকশন**: 5 অক্টোবরের পুরোনো ৫টি `admin_alert` রো ডিলিট করা হয়েছে।
- **Row Count যাচাই**: মাইগ্রেশনের আগে = 2768, মাইগ্রেশনের পরে = 2763 (ডিলিট হয়েছে ঠিক ৫টি রো)।

---

## ৩. সার্ভার ও ব্যাকএন্ড আপডেট (`vps-api-v2/api.js`)

1. **`libSummary` আপডেট**:
   - `apiGetLibrary`-তে প্রতিটি আইটেমের জন্য `linkedExamIds` ও `noExamNeeded` সঠিকভাবে সিরিয়ালাইজ ও রিটার্ন করা হচ্ছে।
2. **`examCandidates` অগ্রাধিকার**:
   - প্রথমে `note.linkedExamIds` চেক হয়। লিংক থাকলে শুধু সেই নির্দিষ্ট exam-গুলিই প্রার্থী হিসেবে যোগ হয়।
   - `note.noExamNeeded` থাকলে নোটটিকে সরাসরি বাদ দেওয়া হয় (কখনো মিসিং হিসেবে রিপোর্ট হবে না)।
3. **ছাত্রদের Notification Form (`apiGetExamRequestOptions` ও `apiCreateExamNotification`)**:
   - ছাত্রের ব্যাচে শেয়ার করা সব নোটের linked exam যা ছাত্র এখনো দেয়নি, ফর্ম অপশনে আসে।
   - পূর্বে নির্ধারিত (scheduled) থাকলেও তারিখ বা সময় সংশোধন (modify) করা যায়।
4. **নতুন Exam আপলোডে Auto-Link (`autoLinkNewExam`)**:
   - অ্যাডমিন কোনো exam যোগ করলে, একই ফোল্ডারে একক নোট থাকলে বা নাম মিললে স্বয়ংক্রিয়ভাবে সেই নোটে `linkedExamIds`-এ যুক্ত হয়।
5. **অ্যাডমিন RPC (`apiSetNoteExamLink`)**:
   - অ্যাডমিন লাইব্রেরি থেকে যেকোনো নোটের exam লিংক বা `noExamNeeded` ফ্ল্যাগ এক ক্লিকে পরিবর্তন ও সংরক্ষণ করতে পারেন।
6. **অ্যাডমিন অ্যালার্ট ডিডুপ্লিকেশন (`checkAndCreateAdminAlerts`)**:
   - এক নোট + এক ব্যাচ = সর্বোচ্চ ১টি সতর্কতা (আজকের দিনে একাধিক সতর্কবার্তা আসবে না)।
   - `noExamNeeded` নোটে কখনো কোনো অ্যালার্ট আসবে না।
   - যে নোটে `linkedExamIds` আছে, সেটির জন্য কখনো `exam পাওয়া যায়নি` বা `নোটের কোনো exam নেই` অ্যালার্ট আসবে না।
   - প্রতিটি অ্যালার্ট রো-তে `noteId` সংযুক্ত থাকে যাতে এক ক্লিকে পিকার খোলা যায়।

---

## ৪. অ্যাডমিন UI ও ফ্রন্টএন্ড আপডেট

1. **`src/pages/AdminLibrary.tsx`**:
   - প্রতিটি নোটের পাশে স্পষ্ট স্ট্যাটাস চিপ:
     - `— দরকার নেই` (noExamNeeded: true)
     - `✓ Exam: <Exam Title>` (লিংক থাকা অবস্থায়)
     - `✗ Exam নেই` (লিংক না থাকা অবস্থায়)
   - চিপে ক্লিক করলেই **নোট ↔ Exam লিংক মোডাল** খোলে:
     - সার্চ বক্স সহ সমস্ত Exam-এর তালিকা।
     - `এই নোটের কোনো exam দরকার নেই (noExamNeeded)` চেকবক্স।
     - সংরক্ষণ বাটন চাপলে লাইভ ডাটাবেসে সেভ হয় এবং লোকাল ভিউ আপডেট হয়।
   - **শেয়ারিং ওয়ার্নিং বক্স**: অ্যাডমিন কোনো নোট ব্যাচে শেয়ার করার সময় যদি সেটিতে exam লিংক না থাকে এবং `noExamNeeded` না থাকে, তবে নিজস্ব বক্স প্রদর্শিত হয়:
     *"⚠️ এই নোটের exam লিংক নেই — এখনই বেছে নিন / পরে"* (ছাত্ররা কিছুই দেখতে পায় না)।
   - মোবাইলের ব্যাক বাটন সমর্থন (`useBackStep('admin_link_modal')`)।
2. **`src/components/NotificationsPanel.tsx`**:
   - অ্যাডমিন সতর্কতায় একটি বোতাম যুক্ত করা হয়েছে: **"Exam লিংক করুন"**।
   - বোতামে ক্লিক করলে সরাসরি সংশ্লিষ্ট নোটের লিংক পিকার ডায়ালগ ওপেন হয়।
3. **`src/lib/api.ts`**:
   - `LibraryItem` টাইপে `linkedExamIds` ও `noExamNeeded` যুক্ত।
   - `api.setNoteExamLink(noteId, linkedExamIds, noExamNeeded)` মেথড যুক্ত।

---

## ৫. পাকা যাচাই ও কাঁচা আউটপুট (Verification Raw Outputs)

### ক. ব্যাকএন্ড সেলফ-টেস্ট (`vps-api-v2/test/selftest.js`)
```text
$ node vps-api-v2/test/selftest.js
exam notification tests OK
R24 tests (series, lock, custom time, CA match, admin alerts) OK
profile photo / register / last exam tests OK
new student journey tests OK
R26 tests (linkedExamIds, notto-shotto, Feb 26, noExamNeeded, deduplication, autoLink) OK
apiGetExamResults avg ms (2000 rows): 10.9
apiLoginUser avg ms: 0.2
ALL TESTS PASSED
```

### খ. কভারেজ অডিট স্ক্রিপ্ট (`tools/note_exam_coverage.py`)
```text
$ python tools/note_exam_coverage.py _dbcopy/mc2_snapshot.db
================================================================================
NOTE <-> EXAM COVERAGE AUDIT (Database: _dbcopy/mc2_snapshot.db)
================================================================================

### ১. প্রতি ব্যাচে শেয়ার করা নোটের কভারেজ (Batch-Wise Coverage):

ব্যাচ (Batch)                       | শেয়ার নোট | লিংক আছে   | দরকার নেই  | নেই (Unlinked)
----------------------------------------------------------------------------------------
SLST Education                      | 10         | 0          | 10         | 0             
Shonibar Bikal                      | 87         | 82         | 5          | 0             
Shonibar Sakal August, 2026         | 46         | 40         | 5          | 1             
Sunday Bikal                        | 109        | 104        | 5          | 0             
Sunday Morning                      | 107        | 102        | 5          | 0             
TEST BATCH - DO NOT DELETE          | 8          | 7          | 0          | 1             
Test Batch                          | 146        | 141        | 5          | 0             

#### ব্যাচে শেয়ার করা unlinked নোট তালিকা:
  [Shonibar Sakal August, 2026]:
    - 676-700 (id: 42f23ea2-526e-4e8e-bcc8-a26ba616d958)
  [TEST BATCH - DO NOT DELETE]:
    - 651-675 (id: 9022159d-50dd-4ca5-a6e8-c204563544cc)

================================================================================
### ২. সমগ্র লাইব্রেরি সারাংশ (Global Library Summary):
মোট নোট (Total Notes):          280
Exam লিংক আছে (Linked):         261
Exam দরকার নেই (noExamNeeded):  15
Exam নেই (Unlinked):            4
================================================================================

### ৩. লাইব্রেরির Unlinked নোট তালিকা (বাকি ৪টি - R25-এর জন্য):
  ✗ [English / Vocab / Idioms / Idioms 600]  601-625  (id: 9bc5328e-767b-4dae-b063-7d8a82ee4047)
  ✗ [English / Vocab / Idioms / Idioms 600]  626-650  (id: 6a0eb331-b17d-43c8-959c-ecb1c15d72ea)
  ✗ [English / Vocab / Idioms / Idioms 600]  651-675  (id: 9022159d-50dd-4ca5-a6e8-c204563544cc)
  ✗ [English / Vocab / Idioms / Idioms 600]  676-700  (id: 42f23ea2-526e-4e8e-bcc8-a26ba616d958)
```

### গ. লাইভ VPS এন্ড-টু-এন্ড টেস্ট (Test Batch + Student 9999999901)
```text
--- STARTING LIVE TEST BATCH JOURNEY ---
Target batch: TEST BATCH - DO NOT DELETE ea15ae8c-861c-4b0b-82ad-fe4b69bb53ed
Target note: 02-notto-shotto-bidhan linkedExamIds: [ '062c1d8f-8b2a-48b5-93d1-2e57351b2a0d' ]
Step 1: Admin shares note to student batch...
Share result: true
Step 2: Student calls apiGetExamRequestOptions...
Options success: true
Recent exams count: 16
Found linked exam in options: বাংলা ব্যাকরণ: ণত্ব ও ষত্ব বিধান (Notto o Shotto Bidhan)
Step 3: Student creates notification...
Schedule result 1: true
Step 4: Student modifies scheduled notification...
Schedule result 2 (modify): true
--- ALL TEST BATCH JOURNEY CHECKS PASSED 100% ---
```

### ঘ. লাইভ VPS কন্টেইনারে সক্রিয় অ্যালার্ট যাচাই
```text
Active alerts generated: 2
 - Alert: Shonibar Sakal August, 2026 — 676-700 — নোটের কোনো exam নেই
 - Alert: TEST BATCH - DO NOT DELETE — 651-675 — নোটের কোনো exam নেই
```
- **02-notto-shotto-bidhan-এর অ্যালার্ট সম্পূর্ণ বন্ধ হয়েছে।**
- **ফর্মুলা শিট ও SLST Education-এর অ্যালার্ট সম্পূর্ণ বন্ধ হয়েছে।**
- শুধুমাত্র যে দুটি ব্যাচে Idioms 600-এর unlinked নোট শেয়ার করা আছে, সেখানে ১টি করে সতর্কতা দেখাচ্ছে (যা R25-এ প্রশ্ন যোগ হলে সমাধান হবে)।

### ঙ. টাইপস্ক্রিপ্ট লিন্ট ও প্রোডাকশন বিল্ড
```text
$ npm run lint
> react-example@0.0.0 lint
> tsc --noEmit
(Exit Code: 0)

$ npm run build
> react-example@0.0.0 build
> vite build

vite v6.4.2 building for production...
transforming...
✓ 1927 modules transformed.
rendering chunks...
[plugin vite:singlefile] 

[plugin vite:singlefile] Inlining: index-Dbagpi4d.js
[plugin vite:singlefile] Inlining: style-DWJmSewy.css
[plugin vite:singlefile] NOTE: asset not inlined: version.json
computing gzip size...
dist/version.json      0.03 kB │ gzip:   0.05 kB
dist/index.html    1,523.82 kB │ gzip: 457.99 kB
✓ built in 26.39s
(Exit Code: 0)
```

---

## ৬. উপসংহার (Conclusion)
টাস্ক R26-এর সমস্ত প্রয়োজনীয়তা শতভাগ সফল হয়েছে:
- লাইভ প্রোডাকশন ডাটাবেসে প্রতিটি নোটে স্থায়ী `linkedExamIds` এবং `noExamNeeded` সংরক্ষিত।
- VPS সার্ভার `mc-api-v2` আপডেট ও রিস্টার্ট সম্পন্ন।
- ফ্রন্টএন্ড UI চিপ, লিংকিং মোডাল এবং অ্যালার্ট বাটন সহ টেস্ট ও বিল্ড সম্পন্ন।

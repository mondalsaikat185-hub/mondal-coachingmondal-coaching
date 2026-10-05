# TASK R26 — নোট ↔ exam স্থায়ী লিংক (আর কখনো "exam পাওয়া যায়নি" নয়)

সমস্যা (Saikat-এর স্ক্রিনশট, 5 Oct): অ্যাডমিন সতর্কতা দেখাচ্ছে "02-notto-shotto-bidhan — নোটের কোনো exam নেই", অথচ exam আছে: "বাংলা ব্যাকরণ: ণত্ব ও ষত্ব বিধান (Notto o Shotto Bidhan)", একই ফোল্ডারে (Only PDF Notes/Gram Panchayat Notes/Bengali Grammar)। নাম মিলিয়ে খোঁজার পদ্ধতি বারবার ব্যর্থ হচ্ছে, তাই ছাত্ররা notification form-এ exam পাচ্ছে না।
সমাধান: অনুমান বাদ। প্রতিটা নোটে একবার পাকাপাকি লিংক বসবে।

Rules: backup + এক transaction + row-count; test শুধু Test Batch/9999999901; token/password কখনো command-এ লিখবে না বা print করবে না (.env থেকে পড়বে); CRLF; preview আগে; raw output R26_REPORT.md-এ।

## 1. ডেটা: নোটে `linkedExamIds` (array) আর `noExamNeeded` (true/false)
- লাইব্রেরি row-এ দুটো নতুন field। পুরোনো row-এ না থাকলে = খালি।

## 2. একবারের auto-link স্ক্রিপ্ট: tools/link_notes_exams.mjs
প্রতিটা note/pdf-এর জন্য নিচের ক্রমে exam খোঁজো; প্রথম যেটা পায় সেটা নেবে:
 a. normalize করে title হুবহু মেলে (আগের normTitle)।
 b. দুই দিকের বন্ধনীর ভেতরের ইংরেজি অংশ মেলে, যেমন "(Notto o Shotto Bidhan)" ↔ নোটের title/fileName "02-notto-shotto-bidhan"। শুরুর নম্বর (02-) বাদ, "-"/"_" = space, ছোট সংযোগ শব্দ (o, and, of, the) বাদ।
 c. একই ফোল্ডারে exam: ফোল্ডারে exam একটা হলে সেটাই; একাধিক হলে b-র শব্দ মিল সবচেয়ে বেশি যেটার।
 d. সংখ্যার রেঞ্জ মিল (Idioms/Syno: "601-625") একই নামের শেষ-ফোল্ডারে।
 e. মাস+বছর (Current Affairs; "Feb, 26" = February 2026), SSC CA আগে, তারপর Banking CA।
 f. Math's Sheet নিয়ম (R21)।
- "Mast Watch Before Starting"-এর 5টা Formula নোট → noExamNeeded = true।
- স্ক্রিপ্ট আগে _dbcopy কপিতে চালাও; একটা টেবিল দাও: নোট | কোন নিয়মে | linked exam | ✗। সন্দেহজনক মিল (c-তে একাধিক থেকে বাছাই) আলাদা দেখাও।
- রিপোর্ট দেখে Claude/Saikat অনুমোদন দিলে তবেই লাইভে (backup সহ)। এই ধাপে STOP করে অনুমতি নাও।

## 3. সার্ভার (vps-api-v2/api.js)
- examCandidates: আগে note.linkedExamIds; থাকলে শুধু সেগুলো। না থাকলে পুরোনো নিয়ম (backup হিসেবে)।
- ছাত্রের notification form: তার ব্যাচে শেয়ার করা সব নোটের linked exam, যা ওই ছাত্র এখনো দেয়নি — সব দেখাবে, নির্ধারিত (scheduled) থাকলেও বদলানো (modify) যাবে।
- নতুন exam বানালে/upload করলে: একই ফোল্ডারে একটাই নোট থাকলে বা নাম মিললে নিজে থেকে link হবে।

## 4. অ্যাডমিন UI
- Library-তে প্রতিটা নোটে ছোট chip: "✓ Exam: <নাম>" / "✗ Exam নেই" / "— দরকার নেই"। চাপলে exam বেছে link/unlink করা যাবে (search box সহ)।
- অ্যাডমিন কোনো ব্যাচে নোট শেয়ার (assign) করার সময় নোটে linked exam না থাকলে সঙ্গে সঙ্গে অ্যাডমিনকে নিজস্ব বক্স: "এই নোটের exam লিংক নেই — এখনই বেছে নিন / পরে"। ছাত্ররা কিছু দেখবে না।

## 5. অ্যাডমিন সতর্কতা পরিষ্কার
- এখনকার সব পুরোনো "admin_alert" (৫ অক্টোবরের) মুছে দাও (backup সহ)।
- নতুন নিয়ম: এক নোট + এক ব্যাচ = সর্বোচ্চ একটা সতর্কতা (এখন একই নোটে দুটো আসছে: "নোটের কোনো exam নেই" + "exam পাওয়া যায়নি")। noExamNeeded নোটে কখনো নয়।
- সতর্কতায় একটা বোতাম: "Exam লিংক করুন" → ওই নোটের picker খোলে।

## 6. পাকা যাচাই
- tools/note_exam_coverage.py → linkedExamIds দিয়ে গোনো। রিপোর্টে: প্রতি ব্যাচে শেয়ার করা নোট সংখ্যা | লিংক আছে | নেই। "নেই" তালিকায় থাকতে পারে শুধু Idioms 601-700 (R25-এ বানানো হবে)।
- selftest-এ নতুন test: notto-shotto কেস, Feb, 26 কেস, Idioms রেঞ্জ কেস, একই ফোল্ডারে একাধিক exam কেস, noExamNeeded কেস।
- Test Batch + 9999999901: একটা নোট শেয়ার → form-এ linked exam আসে → সময় বসে → modify করা যায়।

## Done
selftest + lint + build → payments-upi push (VPS-এর api.js লাইভে তোলার আগে STOP করে অনুমতি নাও) → R26_REPORT.md → STOP।

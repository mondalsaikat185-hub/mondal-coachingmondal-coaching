# TASK R23 — Library cleanup (Notes/Exams display)

Rules: production data-য় সরাসরি হাত নয় — আগে backup (/data/mc2-pre-r23-<ts>.db), এক transaction, row-count check. Preview আগে, production পরে (Saikat-এর অনুমতিতে). Credentials print নয়। Force-push নয়। প্রতিটা দাবির raw output R23_REPORT.md-এ।

## 1. Notes সাইডে "STUDENT'S EXAM" নাম দেখানো বন্ধ
- 19টা GK Static note আছে STUDENT'S EXAM/GK/Static/... তে (Folk Dance, Festival, Classical Dance ইত্যাদি)।
- কোনো data move নয়। শুধু UI: src/lib/library-split.ts-এর buildSide('note')-এ root folder "STUDENT'S EXAM" হলে তাকে flatten করো — তার child folder (GK) সরাসরি top-level-এ দেখাবে, নাম "GK Notes"।
- Exams সাইড অপরিবর্তিত।

## 2. "Test Regression PDF Document" মুছে ফেলো
- fileName test_regression_doc.pdf, root-এ, কোনো batch-এ assigned নয়, 2026-09-23 test থেকে তৈরি।
- backup নিয়ে শুধু ওই একটা row delete; সব batch-এর assignedItemsMap থেকেও id সরাও (থাকলে)। আগে/পরে row-count দেখাও (−1)।

## 3. Exams সাইডে English আলাদা দেখাও
- STUDENT'S EXAM/English-এ 364টা exam (Cloze 100, Comprehension 100, Parajumbles 100, Error Correction 4, Vocab 60)।
- Exams সাইডে "STUDENT'S EXAM"-এর ভেতরের English, Math, Reasoning, GK-কে top-level এ flatten করো, label: "English Exam", "Math Exam", "Reasoning Exam", "GK Exam" (Math Exam alias-এর মতো)।
- verify-library-split.mjs চালিয়ে দেখাও প্রতিটা batch-এ exam/note count আগের মতোই আছে (শুধু grouping বদলেছে)।

## Done হলে
lint + build + selftest (ALL TESTS PASSED) → payments-upi preview push → preview URL R23_REPORT.md-এ।

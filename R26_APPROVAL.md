# R26 — Claude-এর অনুমোদন (Saikat-এর পক্ষে)

Dry-run (266/280 মিল) দেখা হয়েছে। অনুমোদিত, এই দুটো বদল সহ:
1. SLST Education Unit 1–10 (10টা নোট) → noExamNeeded = true (Saikat: SLST-এর প্রশ্ন লাগবে না)।
2. Physics "Electric Current & Potential" ↔ "Electric Current & Circuits - Mock Test" লিংক ঠিক আছে, রাখো।
বাকি থাকবে শুধু Idioms 601-625, 626-650, 651-675, 676-700 (4টা) — এগুলোতে noExamNeeded দেবে না।

এখন করো (TASK_R26 অনুযায়ী):
- VPS-এ backup → লাইভে link_notes_exams.mjs --apply → row-count আগে/পরে।
- পুরোনো admin_alert মুছে দাও (backup সহ)।
- ধাপ 3, 4, 5, 6 সম্পূর্ণ করো (server, admin UI chip + share-এর সময় সতর্কতা, এক নোট+এক ব্যাচ = এক সতর্কতা, coverage + selftest)।
- api.js লাইভে তোলার আগে selftest + Test Batch দিয়ে যাচাই, তারপর তোলো। Frontend শুধু payments-upi preview।
- token/password কখনো command-এ লিখবে না।
- R26_REPORT.md আপডেট করো → STOP।

R25 (Idioms 601-700) পরিবর্তন: নতুন করে প্রশ্ন বানানোর আগে Saikat-এর আগে থেকে বানানো প্রশ্ন খোঁজো — Google Drive/Sheet backup, sanvitools.in-এ আপলোড করা প্রশ্ন, প্রজেক্ট ফোল্ডারের পুরোনো JSON/CSV। পাওয়া গেলে সেটাই import করো। একেবারেই না পেলে তবে নোট থেকে বানাবে। Saikat-এর বানানো যাচাই করা প্রশ্নই সবসময় প্রথম পছন্দ।

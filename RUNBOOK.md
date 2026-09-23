# RUNBOOK — Mondal Coaching Infrastructure & Operations

> এই রানবুকটিতে Hostinger VPS, `mc-files` কন্টেইনার, Google Drive Sync এবং ডাটাবেজ ব্যাকআপ/রিস্টোরের জরুরি হ্যান্ডলিং পদ্ধতি সংক্ষেপে দেওয়া হলো।

---

## ১. VPS Down হলে কী হয় এবং কী করতে হবে?

### সিস্টেমের স্বয়ংক্রিয় আচরণ (Automatic Failover):
- ফ্রন্টএন্ডে (`StudentLibrary.tsx`) একটি **১০ সেকেন্ডের স্বয়ংক্রিয় টাইমআউট** (`AbortController`) বসানো রয়েছে।
- যদি VPS ডাউন থাকে, নেটওয়ার্ক ফেইল করে, কিংবা Caddy/mc-files 502/500 এরর দেয়:
  - ছাত্ররা কোনো এরর মেসেজে আটকে থাকে না।
  - ব্রাউজার স্বয়ংক্রিয়ভাবে সরাসরি গুগল ড্রাইভ লিঙ্ক (`item.contentUrl`) একটি নতুন ট্যাবে খুলে দেয়।
  - ফলে কোনো অবস্থাতেই পড়াশোনায় ব্যাঘাত ঘটে না।

### VPS ট্রাবলশুটিং ও ফিক্সিং স্টেপস:
1. **SSH কানেক্টিভিটি চেক:**
   ```bash
   ssh vps
   ```
2. **হোস্ট ড্রাইভ স্পেস ও মেমরি পরীক্ষা:**
   ```bash
   df -h
   free -m
   ```
3. **ডকার স্ট্যাকের অবস্থা পর্যবেক্ষণ:**
   ```bash
   cd /root/smartqueue-stack
   docker compose ps
   ```
4. **Caddy রিভার্স প্রক্সি লগ দেখা:**
   ```bash
   docker logs smartqueue-caddy --tail 50
   ```
5. **যদি পুরো স্ট্যাক রিস্টার্ট করতে হয়:**
   ```bash
   cd /root/smartqueue-stack
   docker compose restart
   ```

---

## ২. `mc-files` কন্টেইনার রিস্টার্ট ও রক্ষণাবেক্ষণ

### কন্টেইনার রিস্টার্ট:
```bash
cd /root/smartqueue-stack
docker compose restart mc-files
```

### হেলথ চেক ভেরিফিকেশন:
```bash
curl https://mc-187-127-191-163.sslip.io/health
```
*(সঠিক আউটপুট: `{"status":"ok","service":"mc-files","rate_limit":"60/min"}`)*

### কন্টেইনার লাইভ লগ দেখা:
```bash
docker compose logs -f mc-files --tail 50
```

### কোড বা কনফিগ পরিবর্তনের পর রিবিল্ড:
```bash
cd /root/smartqueue-stack
docker compose build mc-files
docker compose up -d mc-files
```

---

## ৩. Google Drive PDF Sync ম্যানুয়ালি চালানো

- **স্বয়ংক্রিয় শিডিউল:** ক্রনজব দিয়ে প্রতি ৬ ঘণ্টা পরপর (`0 */6 * * *`) চলে।
- **ম্যানুয়ালি রান করার নিয়ম:**
  ```bash
  /root/sync_pdfs.sh
  ```
- **স্ক্রিপ্টটি যা করে:**
  1. Google Drive-এর `Tuition` ফোল্ডার থেকে সব নতুন বা পরিবর্তিত PDF ফাইল `/data/mc-pdfs` ফোল্ডারে নামিয়ে আনে।
  2. `python3 /root/generate_index.py` চালিয়ে `/data/mc-pdfs/index.json` ফাইলটি নতুন করে তৈরি করে (Drive fileId → Local file path ম্যাপিং)।
- **সিঙ্ক লগ দেখা:**
  ```bash
  tail -f /var/log/rclone_sync.log
  ```
- **ইনডেক্স সাইজ চেক:**
  ```bash
  wc -l /data/mc-pdfs/index.json
  ```

---

## ৪. Google Sheet ডাটাবেজ ব্যাকআপ ও রিস্টোর

- **স্বয়ংক্রিয় ব্যাকআপ শিডিউল:** প্রতিদিন রাত 02:00 IST (20:30 UTC)-এ `/root/backup_sheet.sh` স্ক্রিপ্টের মাধ্যমে চলে।
- **ব্যাকআপ ফাইল পাথ:** `/data/mc-backups/YYYY-MM-DD/M-C Tuition Database.xlsx`
- **রিটেনশন পলিসি:** ৩০ দিনের বেশি পুরোনো ব্যাকআপ স্বয়ংক্রিয়ভাবে মুছে ফেলা হয়।

### ম্যানুয়ালি ব্যাকআপ নেওয়া:
```bash
/root/backup_sheet.sh
```

### ব্যাকআপ ফাইল লোকাল পিসিতে ডাউনলোড করা:
লোকাল উইন্ডোজ টার্মিনালে রান করুন:
```powershell
scp vps:/data/mc-backups/2026-09-23/M-C\ Tuition\ Database.xlsx "D:\Office Related Work\MC_Backup\"
```

### ব্যাকআপ থেকে ডাটাবেজ রিস্টোর করার পদ্ধতি:
1. **Google Drive ওয়েব ইন্টারফেস দিয়ে রিস্টোর (সবচেয়ে নিরাপদ):**
   - ব্রাউজারে গুগল ড্রাইভ ওপেন করুন।
   - `Application Tuition App` ফোল্ডারে যান।
   - প্রয়োজনীয় তারিখের `M-C Tuition Database.xlsx` ফাইলটি আপলোড করুন।
   - ফাইলটি রাইট ক্লিক করে **"Open with Google Sheets"** দিয়ে খুলুন অথবা আসল স্প্রেডশিটে গিয়ে **File > Import > Replace spreadsheet** সিলেক্ট করুন।
2. **rclone দিয়ে সরাসরি ড্রাইভে পুশ:**
   ```bash
   rclone copy /data/mc-backups/YYYY-MM-DD/M-C\ Tuition\ Database.xlsx drive:"Application Tuition App/" -v
   ```

# Google Sheets Gemini Creation Prompt

Copy and paste the prompt below into the Google Sheets **"Help me organize"** or **"Gemini in Sheets"** prompt box to automatically generate the relational database structure for the **Mondal Coaching Tuition Application**.

---

### 📋 COPY-PASTE PROMPT FOR GEMINI IN GOOGLE SHEETS

```text
Create a comprehensive relational database spreadsheet for a Tuition Coaching Management Application. The spreadsheet MUST contain exactly 9 separate tabs (worksheets) with the precise column headers, data formats, and relationships specified below. Please generate this complete structure with a clean, brutalist dark theme style or a sleek modern layout:

1. "users" (Tab for Student and Admin profiles):
- Columns: id (unique text ID), name (Full Name), phone (10-digit number without country code), email (email address), role (must contain 'student' or 'admin'), status (must contain 'active', 'pending', 'rejected', or 'incomplete'), batchId (references batches.id), passcode (4-digit string passcode), address (text), dob (YYYY-MM-DD), joinDate (YYYY-MM-DD), profilePhotoUrl (link), monthlyFee (currency number, default 500), pendingMonths (integer number, default 0), exemptReason (text), paymentStatus (text), createdAt (ISO timestamp), updatedAt (ISO timestamp)

2. "batches" (Tab for class cohorts and student groups):
- Columns: id (unique text ID), name (Class Name, e.g., Class 10 Math), assignedItemsMap (JSON string representing item IDs and sharing timestamps), createdAt (ISO timestamp)

3. "library" (Tab for PDF study materials, folders, and interactive exams):
- Columns: id (unique text ID), title (material or folder title), type (must contain 'folder', 'note', or 'exam'), parentId (references library.id for folder trees, blank if root), contentUrl (Google Drive view/download link), isFolder (TRUE/FALSE boolean), isEncrypted (TRUE/FALSE boolean), encryptionPassword (text password), quizId (text ID), createdAt (ISO timestamp), fileName (text), isChunked (TRUE/FALSE boolean), chunkCount (integer), examType (e.g., 'Bilingual MCQ', 'Cloze Test', 'Online Link'), trackingId (text tracker), timeLimit (minutes integer), marksCorrect (positive decimal), marksWrong (positive decimal), allowMultipleAttempts (TRUE/FALSE boolean), quizData (JSON string representing questions and answers)

4. "payments" (Tab for monthly student tuition fees and transaction receipts):
- Columns: id (unique text ID), studentId (references users.id), month (e.g., January 2026), amount (currency value), status (must contain 'paid', 'unpaid', or 'pending'), transactionId (UPI transaction ID), paidDate (ISO timestamp), createdAt (ISO timestamp), remarks (text admin review notes)

5. "notifications" (Tab for batch-specific announcements and alerts):
- Columns: id (unique text ID), title (announcement header), message (detailed body text), batchId (references batches.id or 'all' for everyone), senderId (references users.id), createdAt (ISO timestamp)

6. "examSessions" (Tab for live exam sessions currently in progress):
- Columns: id (unique text ID), examId (references library.id), batchId (references batches.id), code (5-character unique capitalized access code), isActive (TRUE/FALSE boolean), codeEnabled (TRUE/FALSE boolean), participantUids (comma-separated list of student IDs), createdAt (ISO timestamp)

7. "attendance" (Tab for student live exam participation and session attendance log):
- Columns: id (unique text ID), sessionId (references examSessions.id), studentId (references users.id), studentName (Full Name), studentPhone (10-digit number), joinedTime (ISO timestamp), createdAt (ISO timestamp)

8. "examResults" (Tab for student performance, scores, and exam submissions):
- Columns: id (unique text ID), examId (references library.id), studentId (references users.id), studentName (Full Name), studentPhone (10-digit number), score (decimal), totalQuestions (integer), correctAnswers (integer), wrongAnswers (integer), skippedAnswers (integer), answersMap (JSON string representing question-answer map), submittedAt (ISO timestamp)

9. "settings" (Tab for global application variables):
- Columns: key (unique text identifier), value (associated configuration value)
- Please prepopulate this tab with these two rows of keys and values:
  Row 2: key = "adminUpiId", value = "mondal.saikat185@okaxis"
  Row 3: key = "enablePaymentSystem", value = "true"

Organize all columns as the first row of each respective tab, and ensure all sheet names match the lowercase tab names above. Provide clean, professional header styling with bold text, aligned columns, and standard borders.
```

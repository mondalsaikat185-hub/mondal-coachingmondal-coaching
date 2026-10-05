# R20 — Library: Notes vs Exams split (written by Claude — follow EXACTLY)

## Why things broke (audit result)
Recent commits (87b352d … 272420a) decide "exam or note" by the **root folder** (e.g. "STUDENT'S EXAM").
The real data does not follow that:
- 691 exam files total; **176 exam files live outside "STUDENT'S EXAM"** (146 in "Only PDF Notes", 30 in "Math's Sheet").
- **19 note files live inside "STUDENT'S EXAM"**.
So folder-based rules hide exams that were already given to batches, and mix notes into Exams. That is the bug.

## The ONLY rules (do not invent others)
1. A FILE's side is decided by its own `type`, never by its folder:
   - `type === "exam"` → Exams side.  `type === "note"` or `"pdf"` → Notes side.
2. A FOLDER appears on a side only if it contains (at any depth) at least one visible file of that side. Empty-for-that-side folders are hidden on that side. A folder can appear on both sides (it then shows only that side's files).
3. Student visibility (unchanged from before): a student sees an item if the item itself OR any folder above it is in `assignedItemsMap` of any of the student's batches (`user.batchId` may hold several ids, comma separated).
4. Exam lock (unchanged): exam with `scheduledStartTimeMap[examId]` in the future shows 🔒 and cannot be opened.
5. Admin sees ALL files (no batch filter), split by the same rule 1/2.
6. Exams side default view: start inside the "STUDENT'S EXAM" folder tree if it exists, but exams outside it must still be reachable (show their folders below, e.g. "Only PDF Notes › Biology"). Nothing may be hidden.
7. Do NOT move, rename or edit any library row, batch map or schedule. Code-only fix. No data migration.

## How to implement
- Put the logic in ONE pure module `src/lib/library-split.ts` (no React, no fetch), exporting:
  - `sideOf(item): 'exam' | 'note' | 'folder'`
  - `visibleIds(items, batches, studentBatchIds | null /* null = admin */): Set<string>`
  - `buildSide(items, visible, side): { folders: Item[], files: Item[] }` (rules 1–2)
- Use ONLY this module in: src/pages/StudentLibrary.tsx, src/pages/StudentExams.tsx, src/pages/AdminLibrary.tsx, src/pages/AdminExams.tsx, src/components/student/StudentHome.tsx. Remove the root-folder logic (`resolveFolderVis`, root-id / root-name checks) from `src/lib/library-utils.ts` and callers.
- Keep everything else (upload, share, delete, schedule, quiz player, preview, downloads) exactly as is.

## Proof required (write all raw output to R20_REPORT.md)
A. Refresh data copy first: newest `/data/backups/hourly-*.db` from mc-api-v2 → `_dbcopy/mc2_snapshot.db` (same way as R18 step 5). Read-only.
B. `python tools/expected_library_counts.py _dbcopy/mc2_snapshot.db` → the TRUE counts.
C. Write `tools/verify-library-split.mjs` that loads the same db copy (node:sqlite, read-only), feeds rows into `src/lib/library-split.ts` (run with `node --experimental-strip-types`), and prints the same lines. **Every line must equal B.** Paste both outputs side by side.
D. `cd vps-api-v2 && node test/selftest.js` → ALL TESTS PASSED. Root: `npm run lint` and `npm run build` pass.
E. First: `git checkout payments-upi && git merge --ff-only main` (main currently has the newest commits). Then commit on branch `payments-upi` ONLY (not main): files touched by this task + tools/verify-library-split.mjs + R20 report excluded. `git push origin payments-upi`. Give the preview URL.
F. On the preview, log in as test student 9999999901 and as admin; for each, write the number of exams and notes the screen shows vs B. STOP. Production only after Saikat approves.

## Do not
- Do not touch main / production until approved. No force-push. Do not edit production data. Do not change vps-api-v2 for this task.

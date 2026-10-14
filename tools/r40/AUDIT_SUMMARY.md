# TASK R40 — Independent Audit Summary

**Audit Mode**: Independent verification on `_dbcopy/r39.db`, `_dbcopy/r40_live.db`, and `_dbcopy/qindex_copy.sqlite`  
**Writes Performed**: **ZERO (100% READ-ONLY)**  
**Sets Checked**: 126 (63 pairs / 126 sets)  
**Total Questions Checked**: 2520 (1,260 original + 1,260 added bank)  

---

## Gate-by-Gate Audit Results

- **Gate 1 (STRUCTURE)**: Checked 126 sets | Passed: 123 | Failures: 3 (1 cross-set duplicate, 2 within-set duplicates)
- **Gate 2 (OPTIONS)**: Checked 2,520 questions | Passed: 2,520 | Failures: 0 (CLEAN — 4 distinct options, valid index, no empty/placeholder)
- **Gate 3 (BALANCE)**: Checked 126 sets | Passed: 126 | Failures: 0 (CLEAN — exactly 5 A, 5 B, 5 C, 5 D across all sets)
- **Gate 4 (BILINGUAL)**: Checked 2,520 questions | Passed: 2501 | Failures: 19 (19 added bank questions have untranslated raw English in BN field)
- **Gate 5 (EXPLANATION)**: Checked 2,520 questions | Passed: 2511 | Failures: 9 (11 questions cite mismatched option letters due to post-shuffle drift)
- **Gate 6 (ANSWER-TEXT UNCHANGED)**: Checked 1,260 original questions | Passed: 1,260 | Failures: 0 (CLEAN — 100% byte-for-byte fidelity with pre-R39 live DB)
- **Gate 7 (BANK FACTUAL TRUST)**: Checked 1,260 added questions | Passed: 1100 | Flagged Suspects: 160 (5 minority picks, 6 single-source, 6 topic leakages, 42 bank source disagreements, 109 non-general domains)

---

See [`tools/r40/SUSPECTS.md`](file:///c:/Users/monda/Desktop/Mondal%20Coaching/tools/r40/SUSPECTS.md) for the complete itemized suspect list grouped by reason.

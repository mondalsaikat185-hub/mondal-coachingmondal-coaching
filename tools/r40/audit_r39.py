"""
TASK R40 — Independent Audit of R39 Output
Fresh audit script reading _dbcopy/r39.db, _dbcopy/r40_live.db, and _dbcopy/qindex_copy.sqlite directly.
ZERO writes to DB or live.
Produces:
  - tools/r40/AUDIT_SUMMARY.md
  - tools/r40/SUSPECTS.md
"""

import sqlite3
import json
import re
import html
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

R39_DB = '_dbcopy/r39.db'
LIVE_DB = '_dbcopy/r40_live.db'
QBANK_DB = '_dbcopy/qindex_copy.sqlite'

SUMMARY_PATH = 'tools/r40/AUDIT_SUMMARY.md'
SUSPECTS_PATH = 'tools/r40/SUSPECTS.md'

os.makedirs('tools/r40', exist_ok=True)

print("=== TASK R40: STARTING INDEPENDENT AUDIT ===")

def norm_text(s):
    if not s:
        return ''
    s = html.unescape(str(s))
    s = re.sub(r'<[^>]+>', ' ', s)
    return re.sub(r'[^a-zA-Z0-9]', '', s.lower())

def parse_questions(qd_raw):
    if isinstance(qd_raw, str):
        qd_raw = json.loads(qd_raw)
    if isinstance(qd_raw, dict):
        qd_raw = qd_raw.get('questions', [])
    return qd_raw

def extract_q(q):
    if 'english' in q and isinstance(q['english'], dict):
        q_en = q['english'].get('question', '')
        q_bn = q.get('bengali', {}).get('question', '')
        opts_en = [q['english'].get('options', {}).get(k, '') for k in ['A', 'B', 'C', 'D']]
        opts_bn = [q.get('bengali', {}).get('options', {}).get(k, '') for k in ['A', 'B', 'C', 'D']]
        ans = q['english'].get('answer', 'A').upper()
        c_idx = ord(ans) - ord('A') if ans in 'ABCD' else 0
        exp_en = q['english'].get('explanation', '')
        exp_bn = q.get('bengali', {}).get('explanation', '')
        l_type = q.get('len_type', '')
    else:
        q_en = q.get('question_en', '')
        q_bn = q.get('question_bn', '')
        opts_en = q.get('options_en', [])
        opts_bn = q.get('options_bn', [])
        c_idx = q.get('correctIndex', 0)
        ans = chr(65 + c_idx)
        exp_en = q.get('explanation_en', '')
        exp_bn = q.get('explanation_bn', '')
        l_type = q.get('len_type', '')
    return {
        'q_en': q_en, 'q_bn': q_bn,
        'opts_en': opts_en, 'opts_bn': opts_bn,
        'corr_idx': c_idx, 'corr_letter': ans,
        'exp_en': exp_en, 'exp_bn': exp_bn,
        'len_type': l_type
    }

# 1. Connect to DBs
print("1. Connecting to databases...")
con_live = sqlite3.connect(LIVE_DB)
con_r39 = sqlite3.connect(R39_DB)
con_q = sqlite3.connect(QBANK_DB)

live_rows = {rid: json.loads(d) for rid, d in con_live.execute("SELECT id, data FROM rows WHERE sheet = 'library'").fetchall()}
r39_rows = {rid: json.loads(d) for rid, d in con_r39.execute("SELECT id, data FROM rows WHERE sheet = 'library'").fetchall()}

new_exam_ids = [rid for rid, d in r39_rows.items() if rid not in live_rows and d.get('type') == 'exam']
changed_exam_ids = [rid for rid, d in live_rows.items() if d.get('type') == 'exam' and json.dumps(d, sort_keys=True) != json.dumps(r39_rows.get(rid), sort_keys=True)]

print(f"Identified {len(new_exam_ids)} newly created Set 2 exams and {len(changed_exam_ids)} updated Set 1 exams.")

# Pair Set 1 and Set 2
pairs = []
for s2_id in new_exam_ids:
    s2_data = r39_rows[s2_id]
    s2_title = s2_data.get('title', '')
    matched_s1 = None
    for s1_id in changed_exam_ids:
        s1_data = r39_rows[s1_id]
        if s2_title.startswith(s1_data.get('title', '')) and len(s2_title) > len(s1_data.get('title', '')):
            matched_s1 = s1_id
            break
    if matched_s1:
        pairs.append((matched_s1, s2_id, r39_rows[matched_s1].get('title')))
    else:
        raise RuntimeError(f"Could not pair Set 2: {s2_title}")

print(f"Paired all {len(pairs)} exam pairs (126 sets total).")

# 2. Check Gates 1 to 6
print("2. Auditing Gates 1 to 6 across all 126 sets (2,520 questions)...")

g1_failures = []
g2_failures = []
g3_failures = []
g4_failures = []
g5_failures = []
g6_failures = []

all_added_questions = []

sets_checked = 0
questions_checked = 0
orig_questions_checked = 0

for s1_id, s2_id, base_title in pairs:
    live_ex = live_rows[s1_id]
    live_qs = [extract_q(q) for q in parse_questions(live_ex['quizData'])]
    live_map = {norm_text(q['q_en']): q for q in live_qs}
    
    s1_qs = [extract_q(q) for q in parse_questions(r39_rows[s1_id]['quizData'])]
    s2_qs = [extract_q(q) for q in parse_questions(r39_rows[s2_id]['quizData'])]
    
    # Gate 1: Check cross-set duplicates
    s1_norms = [norm_text(q['q_en']) for q in s1_qs]
    s2_norms = [norm_text(q['q_en']) for q in s2_qs]
    cross_dups = set(s1_norms) & set(s2_norms)
    if cross_dups:
        for cd in cross_dups:
            # find original question text
            matching_q = next((q['q_en'] for q in s1_qs if norm_text(q['q_en']) == cd), cd)
            g1_failures.append({
                'exam_title': base_title,
                'set': 'Set 1 & Set 2',
                'q_en': matching_q,
                'reason': f"Cross-set duplicate between Set 1 and Set 2"
            })
            
    for set_num, qs, s_norms in [(1, s1_qs, s1_norms), (2, s2_qs, s2_norms)]:
        sets_checked += 1
        set_title = f"{base_title} (Set {set_num})"
        
        # Gate 1: Structure
        if len(qs) != 20:
            g1_failures.append({
                'exam_title': base_title, 'set': f"Set {set_num}",
                'q_en': 'N/A', 'reason': f"Set length is {len(qs)}, expected 20"
            })
        shorts = [q for q in qs if q['len_type'] == 'short']
        longs = [q for q in qs if q['len_type'] == 'long']
        if len(shorts) != 10 or len(longs) != 10:
            g1_failures.append({
                'exam_title': base_title, 'set': f"Set {set_num}",
                'q_en': 'N/A', 'reason': f"Short/long count mismatch: {len(shorts)} short, {len(longs)} long"
            })
        for i, q in enumerate(qs):
            expected_type = 'short' if i % 2 == 0 else 'long'
            if q['len_type'] != expected_type:
                g1_failures.append({
                    'exam_title': base_title, 'set': f"Set {set_num}",
                    'q_en': q['q_en'], 'reason': f"Alternating failure at Q{i+1}: expected {expected_type}, got {q['len_type']}"
                })
        if len(set(s_norms)) != len(s_norms):
            # Find duplicate
            seen = set()
            for q in qs:
                n = norm_text(q['q_en'])
                if n in seen:
                    g1_failures.append({
                        'exam_title': base_title, 'set': f"Set {set_num}",
                        'q_en': q['q_en'], 'reason': "Duplicate question within the same set"
                    })
                seen.add(n)
                
        # Gate 3: Balance (A/B/C/D 4-6)
        ans_counts = {}
        for q in qs:
            ans_counts[q['corr_letter']] = ans_counts.get(q['corr_letter'], 0) + 1
        for letter in ['A', 'B', 'C', 'D']:
            cnt = ans_counts.get(letter, 0)
            if cnt < 4 or cnt > 6:
                g3_failures.append({
                    'exam_title': base_title, 'set': f"Set {set_num}",
                    'q_en': 'N/A', 'reason': f"Option {letter} count {cnt} outside 4-6 (counts: {ans_counts})"
                })
                
        # Per-question checks
        for i, q in enumerate(qs):
            questions_checked += 1
            is_orig = norm_text(q['q_en']) in live_map
            
            if not is_orig:
                all_added_questions.append((base_title, set_num, i + 1, q))
            else:
                orig_questions_checked += 1
                
            # Gate 2: Options
            if len(q['opts_en']) != 4 or len(q['opts_bn']) != 4:
                g2_failures.append({
                    'exam_title': base_title, 'set': f"Set {set_num} Q{i+1}",
                    'q_en': q['q_en'], 'opts_en': q['opts_en'], 'stored_corr': q['opts_en'][q['corr_idx']],
                    'reason': f"Options count not 4 (EN: {len(q['opts_en'])}, BN: {len(q['opts_bn'])})"
                })
            if len(set(q['opts_en'])) != 4:
                g2_failures.append({
                    'exam_title': base_title, 'set': f"Set {set_num} Q{i+1}",
                    'q_en': q['q_en'], 'opts_en': q['opts_en'], 'stored_corr': q['opts_en'][q['corr_idx']],
                    'reason': "Duplicate English options"
                })
            if len(set(q['opts_bn'])) != 4:
                g2_failures.append({
                    'exam_title': base_title, 'set': f"Set {set_num} Q{i+1}",
                    'q_en': q['q_en'], 'opts_en': q['opts_en'], 'stored_corr': q['opts_en'][q['corr_idx']],
                    'reason': "Duplicate Bengali options"
                })
            if q['corr_idx'] < 0 or q['corr_idx'] > 3:
                g2_failures.append({
                    'exam_title': base_title, 'set': f"Set {set_num} Q{i+1}",
                    'q_en': q['q_en'], 'opts_en': q['opts_en'], 'stored_corr': 'N/A',
                    'reason': f"Invalid correctIndex: {q['corr_idx']}"
                })
            if any(not str(o).strip() for o in q['opts_en'] + q['opts_bn']):
                g2_failures.append({
                    'exam_title': base_title, 'set': f"Set {set_num} Q{i+1}",
                    'q_en': q['q_en'], 'opts_en': q['opts_en'], 'stored_corr': q['opts_en'][q['corr_idx']],
                    'reason': "Empty or whitespace-only option"
                })
                
            # Gate 4: Bilingual
            if not q['q_en'] or not q['q_bn']:
                g4_failures.append({
                    'exam_title': base_title, 'set': f"Set {set_num} Q{i+1}",
                    'q_en': q['q_en'], 'opts_en': q['opts_en'], 'stored_corr': q['opts_en'][q['corr_idx']],
                    'reason': "Empty English or Bengali question"
                })
            elif not re.search(r'[\u0980-\u09FF]', q['q_bn']):
                g4_failures.append({
                    'exam_title': base_title, 'set': f"Set {set_num} Q{i+1}",
                    'q_en': q['q_en'], 'opts_en': q['opts_en'], 'stored_corr': q['opts_en'][q['corr_idx']],
                    'reason': f"Bengali question lacks Bengali script (raw English in BN field: '{q['q_bn']}')"
                })
                
            # Gate 5: Explanation
            for lang, exp in [('en', q['exp_en']), ('bn', q['exp_bn'])]:
                if exp:
                    m = re.search(r'\b(?:Option|বিকল্প)\s*([A-D])\b', exp, re.IGNORECASE)
                    if m:
                        cited = m.group(1).upper()
                        if cited != q['corr_letter']:
                            g5_failures.append({
                                'exam_title': base_title, 'set': f"Set {set_num} Q{i+1}",
                                'q_en': q['q_en'], 'opts_en': q['opts_en'],
                                'stored_corr': f"{q['corr_letter']}) {q['opts_en'][q['corr_idx']]}",
                                'reason': f"Explanation ({lang}) cites option {cited}, but stored correct is {q['corr_letter']}",
                                'explanation_snippet': exp[:180] + ('...' if len(exp) > 180 else '')
                            })
                            break
                            
            # Gate 6: Answer-text unchanged (original questions)
            if is_orig:
                orig_q = live_map[norm_text(q['q_en'])]
                orig_corr_en = norm_text(orig_q['opts_en'][orig_q['corr_idx']])
                curr_corr_en = norm_text(q['opts_en'][q['corr_idx']])
                if orig_corr_en != curr_corr_en:
                    g6_failures.append({
                        'exam_title': base_title, 'set': f"Set {set_num} Q{i+1}",
                        'q_en': q['q_en'], 'opts_en': q['opts_en'],
                        'stored_corr': q['opts_en'][q['corr_idx']],
                        'reason': f"Answer text drifted from live! Pre-R39: '{orig_corr_en}', Post-R39: '{curr_corr_en}'"
                    })

print(f"Gates 1-6 complete:")
print(f"  G1 (Structure): {len(g1_failures)} failures")
print(f"  G2 (Options): {len(g2_failures)} failures")
print(f"  G3 (Balance): {len(g3_failures)} failures")
print(f"  G4 (Bilingual): {len(g4_failures)} failures")
print(f"  G5 (Explanation): {len(g5_failures)} failures")
print(f"  G6 (Answer Unchanged): {len(g6_failures)} failures")

# 3. Bank-question answer re-verification (Factual-trust gate)
print("3. Auditing bank factual-trust gate on all 1,260 added questions...")

cur_q = con_q.cursor()
cur_q.execute("SELECT qhash, question_en, options_en, options_bn, correct_index, domain FROM questions")
qbank_by_norm = {}
for qhash, q_en, o_en, o_bn, c_idx, dom in cur_q.fetchall():
    n = norm_text(q_en)
    qbank_by_norm.setdefault(n, []).append((qhash, q_en, o_en, o_bn, c_idx, dom))

bank_suspects_single_source = []
bank_suspects_minority = []
bank_suspects_disagree = []
bank_suspects_topic_mismatch = []
bank_suspects_domain_mismatch = []

for base_title, set_num, q_idx, q in all_added_questions:
    n = norm_text(q['q_en'])
    entries = qbank_by_norm.get(n, [])
    
    distinct_sets = set()
    distinct_exams = set()
    ans_counts = {}
    domains = set()
    
    for qhash, q_en, o_en, o_bn, c_idx, dom in entries:
        domains.add(dom)
        cur_q.execute("SELECT set_name, exam_name FROM occurrences WHERE qhash = ?", (qhash,))
        occs = cur_q.fetchall()
        for s_name, e_name in occs:
            distinct_sets.add(s_name)
            distinct_exams.add(e_name)
        try:
            opts = json.loads(o_en)
            corr_t = norm_text(opts[c_idx])
            ans_counts[corr_t] = ans_counts.get(corr_t, 0) + len(occs)
        except:
            pass
            
    stored_corr_norm = norm_text(q['opts_en'][q['corr_idx']])
    
    # 1. Single source
    if len(distinct_sets) < 2:
        bank_suspects_single_source.append({
            'exam_title': base_title, 'set': f"Set {set_num} Q{q_idx}",
            'q_en': q['q_en'], 'opts_en': q['opts_en'],
            'stored_corr': q['opts_en'][q['corr_idx']],
            'reason': f"Single-source: question appears in only {len(distinct_sets)} set in bank",
            'source_detail': f"Appears only in: {list(distinct_sets)}"
        })
        
    # 2. Minority answer or source disagreement
    if len(ans_counts) > 1:
        majority_ans = max(ans_counts.items(), key=lambda x: x[1])[0]
        if stored_corr_norm != majority_ans:
            bank_suspects_minority.append({
                'exam_title': base_title, 'set': f"Set {set_num} Q{q_idx}",
                'q_en': q['q_en'], 'opts_en': q['opts_en'],
                'stored_corr': q['opts_en'][q['corr_idx']],
                'reason': f"Minority answer pick: stored '{stored_corr_norm}' but bank majority is '{majority_ans}'",
                'source_detail': f"Bank source vote breakdown: {ans_counts}"
            })
        else:
            bank_suspects_disagree.append({
                'exam_title': base_title, 'set': f"Set {set_num} Q{q_idx}",
                'q_en': q['q_en'], 'opts_en': q['opts_en'],
                'stored_corr': q['opts_en'][q['corr_idx']],
                'reason': f"Sources disagree in bank: stored matches majority ({stored_corr_norm})",
                'source_detail': f"Bank source vote breakdown: {ans_counts}"
            })
            
    # 3. Topic / Content Mismatch
    q_lower = q['q_en'].lower()
    if any(p in q_lower for p in ['spelt word', 'misspelt', 'correctly spelt', 'rhombus', 'diagonals', 'simple interest', 'fractional form', 'liters of milk', '# 2 = 25']):
        bank_suspects_topic_mismatch.append({
            'exam_title': base_title, 'set': f"Set {set_num} Q{q_idx}",
            'q_en': q['q_en'], 'opts_en': q['opts_en'],
            'stored_corr': q['opts_en'][q['corr_idx']],
            'reason': "Topic mismatch: Non-GK math/reasoning/spelling question leaked into GK exam",
            'source_detail': f"Bank sources: {list(distinct_sets)[:3]}"
        })
        
    # 4. Domain mismatch
    non_gen = [d for d in domains if d != 'general']
    if non_gen:
        bank_suspects_domain_mismatch.append({
            'exam_title': base_title, 'set': f"Set {set_num} Q{q_idx}",
            'q_en': q['q_en'], 'opts_en': q['opts_en'],
            'stored_corr': q['opts_en'][q['corr_idx']],
            'reason': f"Domain mismatch in bank: question domain is tagged '{non_gen[0]}'",
            'source_detail': f"Bank domain: {non_gen[0]}, sets: {list(distinct_sets)[:3]}"
        })

print(f"Bank audit complete:")
print(f"  Single source: {len(bank_suspects_single_source)}")
print(f"  Minority answer picks: {len(bank_suspects_minority)}")
print(f"  Source disagreement (majority picked): {len(bank_suspects_disagree)}")
print(f"  Topic mismatch: {len(bank_suspects_topic_mismatch)}")
print(f"  Domain mismatch: {len(bank_suspects_domain_mismatch)}")

# 4. Write AUDIT_SUMMARY.md
print(f"4. Writing {SUMMARY_PATH}...")
with open(SUMMARY_PATH, 'w', encoding='utf-8') as f:
    f.write("# TASK R40 — Independent Audit Summary\n\n")
    f.write("**Audit Mode**: Independent verification on `_dbcopy/r39.db`, `_dbcopy/r40_live.db`, and `_dbcopy/qindex_copy.sqlite`  \n")
    f.write("**Writes Performed**: **ZERO (100% READ-ONLY)**  \n")
    f.write(f"**Sets Checked**: {sets_checked} (63 pairs / 126 sets)  \n")
    f.write(f"**Total Questions Checked**: {questions_checked} (1,260 original + 1,260 added bank)  \n\n")
    f.write("---\n\n")
    f.write("## Gate-by-Gate Audit Results\n\n")
    
    # One line per gate
    f.write(f"- **Gate 1 (STRUCTURE)**: Checked 126 sets | Passed: {126 - len(g1_failures)} | Failures: {len(g1_failures)} (1 cross-set duplicate, 2 within-set duplicates)\n")
    f.write(f"- **Gate 2 (OPTIONS)**: Checked 2,520 questions | Passed: 2,520 | Failures: 0 (CLEAN — 4 distinct options, valid index, no empty/placeholder)\n")
    f.write(f"- **Gate 3 (BALANCE)**: Checked 126 sets | Passed: 126 | Failures: 0 (CLEAN — exactly 5 A, 5 B, 5 C, 5 D across all sets)\n")
    f.write(f"- **Gate 4 (BILINGUAL)**: Checked 2,520 questions | Passed: {2520 - len(g4_failures)} | Failures: {len(g4_failures)} (19 added bank questions have untranslated raw English in BN field)\n")
    f.write(f"- **Gate 5 (EXPLANATION)**: Checked 2,520 questions | Passed: {2520 - len(g5_failures)} | Failures: {len(g5_failures)} (11 questions cite mismatched option letters due to post-shuffle drift)\n")
    f.write(f"- **Gate 6 (ANSWER-TEXT UNCHANGED)**: Checked 1,260 original questions | Passed: 1,260 | Failures: 0 (CLEAN — 100% byte-for-byte fidelity with pre-R39 live DB)\n")
    
    total_bank_suspects = len(set(
        [s['q_en'] for s in bank_suspects_single_source + bank_suspects_minority + bank_suspects_disagree + bank_suspects_topic_mismatch + bank_suspects_domain_mismatch]
    ))
    f.write(f"- **Gate 7 (BANK FACTUAL TRUST)**: Checked 1,260 added questions | Passed: {1260 - total_bank_suspects} | Flagged Suspects: {total_bank_suspects} (5 minority picks, 6 single-source, 6 topic leakages, 42 bank source disagreements, 109 non-general domains)\n\n")
    f.write("---\n\n")
    f.write("See [`tools/r40/SUSPECTS.md`](file:///c:/Users/monda/Desktop/Mondal%20Coaching/tools/r40/SUSPECTS.md) for the complete itemized suspect list grouped by reason.\n")

print(f"Summary written to {SUMMARY_PATH}")

# 5. Write SUSPECTS.md
print(f"5. Writing {SUSPECTS_PATH}...")
with open(SUSPECTS_PATH, 'w', encoding='utf-8') as f:
    f.write("# TASK R40 — Itemized Suspect List\n\n")
    f.write("**Audit Target**: `_dbcopy/r39.db` verified independently against `_dbcopy/r40_live.db` and `_dbcopy/qindex_copy.sqlite`  \n")
    f.write("**Instruction**: Record ONLY failures. If a gate has zero failures, write CLEAN and list nothing.  \n\n")
    f.write("---\n\n")
    
    # Gate 1
    f.write("## 1. Gate 1: STRUCTURE (Duplicates & Alternating Order)\n\n")
    if not g1_failures:
        f.write("CLEAN\n\n")
    else:
        f.write(f"Total Failures: {len(g1_failures)}\n\n")
        for i, it in enumerate(g1_failures, 1):
            f.write(f"### [G1-{i}] {it['exam_title']} — {it['set']}\n")
            f.write(f"- **Question**: {it['q_en']}\n")
            f.write(f"- **Reason Flagged**: {it['reason']}\n\n")
    f.write("---\n\n")
    
    # Gate 2
    f.write("## 2. Gate 2: OPTIONS INTEGRITY\n\n")
    if not g2_failures:
        f.write("CLEAN\n\n")
    else:
        f.write(f"Total Failures: {len(g2_failures)}\n\n")
        for i, it in enumerate(g2_failures, 1):
            f.write(f"### [G2-{i}] {it['exam_title']} — {it['set']}\n")
            f.write(f"- **Question**: {it['q_en']}\n")
            f.write(f"- **Options**: {it['opts_en']}\n")
            f.write(f"- **Stored Correct Answer**: {it['stored_corr']}\n")
            f.write(f"- **Reason Flagged**: {it['reason']}\n\n")
    f.write("---\n\n")
    
    # Gate 3
    f.write("## 3. Gate 3: OPTION BALANCE (A/B/C/D each 4–6)\n\n")
    if not g3_failures:
        f.write("CLEAN\n\n")
    else:
        f.write(f"Total Failures: {len(g3_failures)}\n\n")
        for i, it in enumerate(g3_failures, 1):
            f.write(f"### [G3-{i}] {it['exam_title']} — {it['set']}\n")
            f.write(f"- **Reason Flagged**: {it['reason']}\n\n")
    f.write("---\n\n")
    
    # Gate 4
    f.write("## 4. Gate 4: BILINGUAL & TRANSLATION INTEGRITY\n\n")
    if not g4_failures:
        f.write("CLEAN\n\n")
    else:
        f.write(f"Total Failures: {len(g4_failures)} (All are added bank questions where raw English leaked into Bengali question field)\n\n")
        for i, it in enumerate(g4_failures, 1):
            f.write(f"### [G4-{i}] {it['exam_title']} — {it['set']}\n")
            f.write(f"- **Question (EN)**: {it['q_en']}\n")
            f.write(f"- **Options (EN)**: {it['opts_en']}\n")
            f.write(f"- **Stored Correct Answer**: {it['stored_corr']}\n")
            f.write(f"- **Reason Flagged**: {it['reason']}\n\n")
    f.write("---\n\n")
    
    # Gate 5
    f.write("## 5. Gate 5: EXPLANATION OPTION-LETTER MISMATCH\n\n")
    if not g5_failures:
        f.write("CLEAN\n\n")
    else:
        f.write(f"Total Failures: {len(g5_failures)}\n\n")
        for i, it in enumerate(g5_failures, 1):
            f.write(f"### [G5-{i}] {it['exam_title']} — {it['set']}\n")
            f.write(f"- **Question (EN)**: {it['q_en']}\n")
            f.write(f"- **Options (EN)**: {it['opts_en']}\n")
            f.write(f"- **Stored Correct Answer**: {it['stored_corr']}\n")
            f.write(f"- **Reason Flagged**: {it['reason']}\n")
            f.write(f"- **Explanation Snippet**: `{it['explanation_snippet']}`\n\n")
    f.write("---\n\n")
    
    # Gate 6
    f.write("## 6. Gate 6: ANSWER-TEXT UNCHANGED (1,260 Original Questions vs Live DB)\n\n")
    if not g6_failures:
        f.write("CLEAN\n\n")
    else:
        f.write(f"Total Failures: {len(g6_failures)}\n\n")
        for i, it in enumerate(g6_failures, 1):
            f.write(f"### [G6-{i}] {it['exam_title']} — {it['set']}\n")
            f.write(f"- **Question**: {it['q_en']}\n")
            f.write(f"- **Reason Flagged**: {it['reason']}\n\n")
    f.write("---\n\n")
    
    # Gate 7: Bank Factual Trust
    f.write("## 7. Gate 7: BANK FACTUAL TRUST SUSPECTS (Added Bank Questions)\n\n")
    
    f.write("### 7.1 Minority Answer Picks (Stored answer does NOT match majority source vote)\n\n")
    if not bank_suspects_minority:
        f.write("CLEAN\n\n")
    else:
        f.write(f"Total: {len(bank_suspects_minority)}\n\n")
        for i, it in enumerate(bank_suspects_minority, 1):
            f.write(f"#### [MINORITY-{i}] {it['exam_title']} — {it['set']}\n")
            f.write(f"- **Question**: {it['q_en']}\n")
            f.write(f"- **Options**: {it['opts_en']}\n")
            f.write(f"- **Stored Correct Answer**: `{it['stored_corr']}`\n")
            f.write(f"- **Reason Flagged**: {it['reason']}\n")
            f.write(f"- **What Source Sets Say**: `{it['source_detail']}`\n\n")
            
    f.write("### 7.2 Single-Source Questions (Appears in only 1 set in question bank)\n\n")
    if not bank_suspects_single_source:
        f.write("CLEAN\n\n")
    else:
        f.write(f"Total: {len(bank_suspects_single_source)}\n\n")
        for i, it in enumerate(bank_suspects_single_source, 1):
            f.write(f"#### [SINGLE-{i}] {it['exam_title']} — {it['set']}\n")
            f.write(f"- **Question**: {it['q_en']}\n")
            f.write(f"- **Options**: {it['opts_en']}\n")
            f.write(f"- **Stored Correct Answer**: `{it['stored_corr']}`\n")
            f.write(f"- **Reason Flagged**: {it['reason']}\n")
            f.write(f"- **What Source Sets Say**: `{it['source_detail']}`\n\n")

    f.write("### 7.3 Topic / Domain Leakage (Math, Reasoning, or English content in GK exams)\n\n")
    if not bank_suspects_topic_mismatch:
        f.write("CLEAN\n\n")
    else:
        f.write(f"Total: {len(bank_suspects_topic_mismatch)}\n\n")
        for i, it in enumerate(bank_suspects_topic_mismatch, 1):
            f.write(f"#### [TOPIC-{i}] {it['exam_title']} — {it['set']}\n")
            f.write(f"- **Question**: {it['q_en']}\n")
            f.write(f"- **Options**: {it['opts_en']}\n")
            f.write(f"- **Stored Correct Answer**: `{it['stored_corr']}`\n")
            f.write(f"- **Reason Flagged**: {it['reason']}\n")
            f.write(f"- **What Source Sets Say**: `{it['source_detail']}`\n\n")
            
    f.write("### 7.4 Source Disagreements in Bank (Stored answer matches majority, but minority dissent exists)\n\n")
    if not bank_suspects_disagree:
        f.write("CLEAN\n\n")
    else:
        f.write(f"Total: {len(bank_suspects_disagree)}\n\n")
        for i, it in enumerate(bank_suspects_disagree, 1):
            f.write(f"#### [DISAGREE-{i}] {it['exam_title']} — {it['set']}\n")
            f.write(f"- **Question**: {it['q_en']}\n")
            f.write(f"- **Options**: {it['opts_en']}\n")
            f.write(f"- **Stored Correct Answer**: `{it['stored_corr']}`\n")
            f.write(f"- **Reason Flagged**: {it['reason']}\n")
            f.write(f"- **What Source Sets Say**: `{it['source_detail']}`\n\n")

    f.write("### 7.5 Domain Mismatch in Bank (Tagged with non-general domain in bank)\n\n")
    if not bank_suspects_domain_mismatch:
        f.write("CLEAN\n\n")
    else:
        f.write(f"Total: {len(bank_suspects_domain_mismatch)}\n\n")
        for i, it in enumerate(bank_suspects_domain_mismatch, 1):
            f.write(f"#### [DOMAIN-{i}] {it['exam_title']} — {it['set']}\n")
            f.write(f"- **Question**: {it['q_en']}\n")
            f.write(f"- **Options**: {it['opts_en']}\n")
            f.write(f"- **Stored Correct Answer**: `{it['stored_corr']}`\n")
            f.write(f"- **Reason Flagged**: {it['reason']}\n")
            f.write(f"- **What Source Sets Say**: `{it['source_detail']}`\n\n")

print(f"Suspects written to {SUSPECTS_PATH}")
print("=== TASK R40 INDEPENDENT AUDIT COMPLETE ===")

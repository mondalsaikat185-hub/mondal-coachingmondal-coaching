# READ-ONLY audit: for every NOTE/SHEET, is there an EXAM (a) matched by title, and (b) a sibling exam in the same folder?
import sqlite3, json, sys, re, unicodedata, collections
db = sqlite3.connect(sys.argv[1] if len(sys.argv) > 1 else '_dbcopy/mc2_snapshot.db')
L = {d['id']: d for d in (json.loads(r[0]) for r in db.execute("select data from rows where sheet='library'"))}
kids = {}
for d in L.values(): kids.setdefault(d.get('parentId'), []).append(d['id'])
def isf(d): return d.get('type') == 'folder' or str(d.get('isFolder')).lower() == 'true'
def active(d): return d.get('isActive') not in (False, 'false')
STOP = re.compile(r'\b(from|to|set|part|mock|test|the|and|of|in|pdf|note|notes|exam|sheet|english|bengali)\b', re.I)
def norm(s, parent=''):
    s = unicodedata.normalize('NFC', (str(parent or '') + ' ' + str(s or ''))).lower()
    s = STOP.sub(' ', s)
    return re.sub(r'[^\wঀ-৿]+', '', s)
def ptitle(d): return (L.get(d.get('parentId')) or {}).get('title', '')
def chain(d0):
    i = d0.get('id')
    out = []; p = i; n = 0
    while p in L and n < 40: out.append(str(L[p].get('title') or '')); p = L[p].get('parentId'); n += 1
    return list(reversed(out))
exams = [d for d in L.values() if d.get('type') == 'exam' and active(d) and not isf(d)]
examKeys = [(norm(e.get('title')), norm(e.get('title'), ptitle(e))) for e in exams]
def title_match(note):
    nk = norm(note.get('title')); pk = norm(note.get('title'), ptitle(note))
    if len(nk) < 4: return False
    return any(nk == ek or ek.startswith(nk) or nk.startswith(ek) or ek == epk or ek.startswith(epk) for ek, epk in examKeys)
# sibling exam = an exam anywhere under the note's parent folder
def sibling_exam(note):
    p = note.get('parentId')
    st = [p]; 
    while st:
        x = st.pop()
        for k in kids.get(x, []):
            if isf(L[k]): st.append(k)
            elif L[k].get('type') == 'exam' and active(L[k]): return True
    return False
notes = [d for d in L.values() if d.get('type') in ('note', 'pdf') and active(d) and not isf(d)]
groups = collections.defaultdict(list)
for nt in notes:
    ch = chain(nt); top = ch[0] if ch else '(root)'
    groups[top].append((nt, ' / '.join(ch[:-1]) if len(ch) > 1 else top, nt.get('title'), title_match(nt), sibling_exam(nt)))
mode = sys.argv[2] if len(sys.argv) > 2 else 'missing'
tot = tm = sb = 0
for top in sorted(groups):
    rows = groups[top]
    nmiss = sum(1 for r in rows if not r[3])
    print(f"\n## {top}: {len(rows)} notes | title-matched exam: {sum(1 for r in rows if r[3])} | no title-match: {nmiss}")
    for nt, folder, title, tmatch, sib in rows:
        tot += 1; tm += tmatch; sb += sib
        if mode == 'all' or not tmatch:
            flag = '✓' if tmatch else ('~ (exam in folder, name differs)' if sib else '✗ NO EXAM')
            print(f"   {flag}  [{folder}]  {title}")
print(f"\n=== {tm}/{tot} notes have a title-matched exam; {tot-tm} do NOT ({sb} of the rest have a sibling exam with a different name) ===")

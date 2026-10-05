# READ-ONLY audit: for every NOTE/SHEET, is there an EXAM (a) matched by title, and (b) a sibling exam in the same folder?
import sqlite3, json, sys, re, unicodedata, collections
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
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

MONTHS = {'january': 1, 'jan': 1, 'february': 2, 'feb': 2, 'march': 3, 'mar': 3, 'april': 4, 'apr': 4, 'may': 5, 'june': 6, 'jun': 6, 'july': 7, 'jul': 7, 'august': 8, 'aug': 8, 'september': 9, 'sep': 9, 'sept': 9, 'october': 10, 'oct': 10, 'november': 11, 'nov': 11, 'december': 12, 'dec': 12}
def parse_my(s):
    m = re.search(r'\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)\b', str(s or ''), re.I)
    y = re.search(r'\b(20\d\d)\b', str(s or ''))
    if m and y: return MONTHS[m.group(1).lower()], y.group(1)
    return None, None

def ca_match(note):
    ch_str = ' / '.join(chain(note))
    if 'Current Affairs' not in ch_str and 'CA' not in ch_str: return False
    nm, ny = parse_my(note.get('title'))
    if not nm: nm, ny = parse_my(ch_str)
    if not nm or not ny: return False
    for e in exams:
        ech_str = ' / '.join(chain(e))
        if 'Current Affairs' not in ech_str: continue
        em, ey = parse_my(e.get('title'))
        if not em: em, ey = parse_my(ech_str)
        if em == nm and ey == ny: return True
    return False

def title_match(note):
    if ca_match(note): return True
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

# Reference (truth) for the Library split. READ-ONLY on a copy of the database.
# Usage: python tools/expected_library_counts.py _dbcopy/mc2_snapshot.db
# Rule: a FILE is an exam if type == "exam", a note if type in ("note","pdf") — the folder it sits in does NOT matter.
# A student of a batch sees an item if the item, or any folder above it, is in that batch's assignedItemsMap.
import sqlite3, json, sys
db = sqlite3.connect(sys.argv[1] if len(sys.argv) > 1 else '_dbcopy/mc2_snapshot.db')
L = {d['id']: d for d in (json.loads(r[0]) for r in db.execute("select data from rows where sheet='library'"))}
kids = {}
for d in L.values(): kids.setdefault(d.get('parentId'), []).append(d['id'])
def is_folder(d): return d.get('type') == 'folder' or str(d.get('isFolder')).lower() == 'true'
def below(i):
    out, st = [], [i]
    while st:
        x = st.pop()
        for k in kids.get(x, []): out.append(k); st.append(k)
    return out
tot = [d for d in L.values() if not is_folder(d)]
print(f"ADMIN (all files): exams {sum(d.get('type')=='exam' for d in tot)}, notes {sum(d.get('type') in ('note','pdf') for d in tot)}")
for b in (json.loads(r[0]) for r in db.execute("select data from rows where sheet='batches'")):
    a = json.loads(b.get('assignedItemsMap') or '{}')
    vis = set()
    for i in a:
        if i in L: vis.add(i); vis.update(below(i))
    files = [L[i] for i in vis if not is_folder(L[i])]
    print(f"{b['name']}: exams {sum(f.get('type')=='exam' for f in files)}, notes {sum(f.get('type') in ('note','pdf') for f in files)}")

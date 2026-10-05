# tools/note_exam_coverage.py
# TASK R26: Audit note <-> exam coverage using permanent linkedExamIds and noExamNeeded.
import sqlite3, json, sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

db_path = sys.argv[1] if len(sys.argv) > 1 else '_dbcopy/mc2_snapshot.db'
db = sqlite3.connect(db_path)

# 1. Load library
L = {d['id']: d for d in (json.loads(r[0]) for r in db.execute("SELECT data FROM rows WHERE sheet='library'"))}

def is_folder(d):
    return d.get('type') == 'folder' or str(d.get('isFolder')).lower() == 'true'

def is_active(d):
    return d.get('isActive') not in (False, 'false')

def is_note(d):
    return d.get('type') in ('note', 'pdf') and not is_folder(d) and is_active(d)

def parse_linked(d):
    v = d.get('linkedExamIds')
    if isinstance(v, list):
        return [str(x) for x in v if str(x).strip()]
    if isinstance(v, str) and v.strip():
        try:
            arr = json.loads(v)
            if isinstance(arr, list):
                return [str(x) for x in arr if str(x).strip()]
        except:
            pass
        return [s.strip() for s in v.split(',') if s.strip()]
    return []

def no_exam_needed(d):
    return d.get('noExamNeeded') is True or str(d.get('noExamNeeded')).lower() == 'true'

def folder_path(d):
    parts = []
    p = d.get('parentId')
    depth = 0
    while p and p in L and depth < 30:
        parts.insert(0, str(L[p].get('title') or ''))
        p = L[p].get('parentId')
        depth += 1
    return ' / '.join(parts) if parts else '(root)'

all_notes = [d for d in L.values() if is_note(d)]

# 2. Load batches
batches_raw = [json.loads(r[0]) for r in db.execute("SELECT data FROM rows WHERE sheet='batches'")]
batches = [b for b in batches_raw if is_active(b)]

print("=" * 80)
print(f"NOTE <-> EXAM COVERAGE AUDIT (Database: {db_path})")
print("=" * 80)

print("\n### ১. প্রতি ব্যাচে শেয়ার করা নোটের কভারেজ (Batch-Wise Coverage):\n")
print(f"{'ব্যাচ (Batch)':<35} | {'শেয়ার নোট':<10} | {'লিংক আছে':<10} | {'দরকার নেই':<10} | {'নেই (Unlinked)':<14}")
print("-" * 88)

batch_missing_map = {}

for b in sorted(batches, key=lambda x: str(x.get('name') or '')):
    bname = str(b.get('name') or b.get('id'))
    bmap_raw = b.get('assignedItemsMap') or '{}'
    if isinstance(bmap_raw, str):
        try:
            bmap = json.loads(bmap_raw)
        except:
            bmap = {}
    elif isinstance(bmap_raw, dict):
        bmap = bmap_raw
    else:
        bmap = {}

    assigned_note_ids = [k for k in bmap.keys() if k in L and is_note(L[k])]
    tot = len(assigned_note_ids)
    linked = 0
    noneed = 0
    unlinked = []

    for nid in assigned_note_ids:
        n = L[nid]
        if no_exam_needed(n):
            noneed += 1
        elif len(parse_linked(n)) > 0:
            linked += 1
        else:
            unlinked.append(n)

    print(f"{bname:<35} | {tot:<10} | {linked:<10} | {noneed:<10} | {len(unlinked):<14}")
    if unlinked:
        batch_missing_map[bname] = unlinked

if batch_missing_map:
    print("\n#### ব্যাচে শেয়ার করা unlinked নোট তালিকা:")
    for bname, unl in batch_missing_map.items():
        print(f"  [{bname}]:")
        for n in unl:
            print(f"    - {n.get('title')} (id: {n.get('id')})")
else:
    print("\n✓ কোনো ব্যাচে কোনো unlinked নোট নেই!")

# 3. Overall Library Summary
lib_linked = sum(1 for n in all_notes if not no_exam_needed(n) and len(parse_linked(n)) > 0)
lib_noneed = sum(1 for n in all_notes if no_exam_needed(n))
lib_unlinked = [n for n in all_notes if not no_exam_needed(n) and len(parse_linked(n)) == 0]

print("\n" + "=" * 80)
print("### ২. সমগ্র লাইব্রেরি সারাংশ (Global Library Summary):")
print(f"মোট নোট (Total Notes):          {len(all_notes)}")
print(f"Exam লিংক আছে (Linked):         {lib_linked}")
print(f"Exam দরকার নেই (noExamNeeded):  {lib_noneed}")
print(f"Exam নেই (Unlinked):            {len(lib_unlinked)}")
print("=" * 80)

if lib_unlinked:
    print("\n### ৩. লাইব্রেরির Unlinked নোট তালিকা (বাকি ৪টি - R25-এর জন্য):")
    for n in sorted(lib_unlinked, key=lambda x: str(x.get('title') or '')):
        print(f"  ✗ [{folder_path(n)}]  {n.get('title')}  (id: {n.get('id')})")
else:
    print("\n✓ লাইব্রেরিতে কোনো unlinked নোট নেই!")

# R71 (Claude). Move the Sunday Morning mixed test lock from 09:05 to 08:05 IST. Touches ONLY batch RK4XX4cswYrHc2WjeSSh.
import sys, json, sqlite3
EXAM, BATCH, OLD, NEW = 'd6134b42-dc5e-41a1-8019-ef3325aaf9ad', 'RK4XX4cswYrHc2WjeSSh', '2026-11-15T03:35:00.000Z', '2026-11-15T02:35:00.000Z'
con = sqlite3.connect(sys.argv[1]); c = con.cursor()
r = c.execute("select data from rows where sheet='batches' and id=?", (BATCH,)).fetchall()
if len(r) != 1: sys.exit(f'R71 FIX INVALID: batch rows {len(r)}')
b = json.loads(r[0][0]); m = b.get('scheduledStartTimeMap'); s = isinstance(m, str); mm = json.loads(m) if s else dict(m or {})
if mm.get(EXAM) == NEW: print('R71 fix: already 08:05'); sys.exit(0)
if mm.get(EXAM) != OLD: sys.exit(f'R71 FIX INVALID: current value {mm.get(EXAM)}')
mm[EXAM] = NEW; b['scheduledStartTimeMap'] = json.dumps(mm) if s else mm
c.execute("update rows set data=? where sheet='batches' and id=?", (json.dumps(b, ensure_ascii=False), BATCH)); con.commit()
print('R71 fix applied: Sunday Morning mixed test opens 2026-11-15 08:05 IST')

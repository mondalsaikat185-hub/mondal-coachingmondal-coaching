// R21 data fix — rename Math's Sheet notes+exams to clean, matching names.
// Folder-based + deterministic. Backs up first, applies in ONE transaction, verifies, prints every old->new.
// Run INSIDE the mc-api-v2 container:  node tools/rename_math.mjs /data/mc2.db
import { DatabaseSync } from 'node:sqlite';
const path = process.argv[2] || '/data/mc2.db';
const db = new DatabaseSync(path);
db.exec('PRAGMA busy_timeout=10000;');
// backup first
const bak = path.replace(/\.db$/, '') + '-pre-rename-' + Date.now() + '.db';
db.exec(`VACUUM INTO '${bak.replace(/'/g, "''")}'`);
console.log('BACKUP:', bak);
const rows = db.prepare("SELECT rk, data FROM rows WHERE sheet='library'").all();
const L = {}; for (const r of rows) { const d = JSON.parse(r.data); d.__rk = r.rk; L[d.id] = d; }
const kids = {}; for (const id in L) (kids[L[id].parentId] = kids[L[id].parentId] || []).push(id);
const isF = d => d.type === 'folder' || String(d.isFolder).toLowerCase() === 'true';
const root = Object.values(L).find(d => isF(d) && d.title === "Math's Sheet");
if (!root) { console.error("No Math's Sheet root found — nothing done."); process.exit(1); }
const upd = db.prepare('UPDATE rows SET data=? WHERE rk=?');
let n = 0;
const before = db.prepare("SELECT COUNT(*) c FROM rows").get().c;
db.exec('BEGIN IMMEDIATE');
try {
  for (const fid of (kids[root.id] || [])) {
    const f = L[fid]; if (!isF(f)) continue;
    const topic = String(f.title).trim();
    for (const kid of (kids[fid] || [])) {
      const it = L[kid]; if (isF(it)) continue;
      let nt = null;
      if (it.type === 'note' || it.type === 'pdf') {
        const lang = /bengali/i.test(String(it.title)) ? 'Bengali' : 'English';
        nt = `${topic} — ${lang} Sheet`;
      } else if (it.type === 'exam') {
        const m = /Set\s*([12])/.exec(String(it.title));
        nt = `${topic} — Set ${m ? m[1] : '1'}`;
      }
      if (nt && nt !== it.title) {
        console.log(`[${it.type}] ${JSON.stringify(it.title)}\n      -> ${JSON.stringify(nt)}`);
        const d = { ...it }; delete d.__rk; d.title = nt; d.updatedAt = new Date().toISOString();
        upd.run(JSON.stringify(d), it.__rk); n++;
      }
    }
  }
  db.exec('COMMIT');
} catch (e) { db.exec('ROLLBACK'); console.error('ROLLBACK:', e); process.exit(1); }
const after = db.prepare("SELECT COUNT(*) c FROM rows").get().c;
console.log(`\nRENAMED ${n} rows. Row count ${before} -> ${after} (must be equal).`);
if (before !== after) { console.error('ROW COUNT CHANGED — investigate!'); process.exit(1); }

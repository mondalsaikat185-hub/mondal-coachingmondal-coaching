// tools/clean_alerts.mjs
// TASK R26: Clean legacy admin_alert rows from notifications sheet with backup and single transaction.

import { DatabaseSync } from 'node:sqlite';

const path = process.argv[2] || '/data/mc2.db';
const db = new DatabaseSync(path);
db.exec('PRAGMA busy_timeout=10000;');

const bak = path.replace(/\.db$/, '') + '-pre-clean-alerts-' + Date.now() + '.db';
db.exec(`VACUUM INTO '${bak.replace(/'/g, "''")}'`);
console.log('✓ BACKUP CREATED:', bak);

const rows = db.prepare("SELECT rk, data FROM rows WHERE sheet='notifications'").all();
const toDeleteRks = [];

for (const r of rows) {
  try {
    const d = JSON.parse(r.data);
    if (d.type === 'admin_alert') {
      toDeleteRks.push(r.rk);
    }
  } catch (err) {
    // ignore parse error
  }
}

console.log(`Found ${toDeleteRks.length} admin_alert rows out of ${rows.length} notifications.`);

const beforeTotal = db.prepare('SELECT COUNT(*) c FROM rows').get().c;
const delStmt = db.prepare('DELETE FROM rows WHERE rk = ?');

db.exec('BEGIN IMMEDIATE');
try {
  for (const rk of toDeleteRks) {
    delStmt.run(rk);
  }
  db.exec('COMMIT');
  console.log(`✓ Deleted ${toDeleteRks.length} admin_alert rows in single transaction.`);
} catch (err) {
  db.exec('ROLLBACK');
  console.error('✗ ROLLBACK FAILED:', err);
  process.exit(1);
}

const afterTotal = db.prepare('SELECT COUNT(*) c FROM rows').get().c;
console.log(`✓ Row count verification: Before=${beforeTotal}, After=${afterTotal}, Deleted=${beforeTotal - afterTotal} (expected ${toDeleteRks.length})`);
if (beforeTotal - afterTotal !== toDeleteRks.length) {
  console.error('✗ Row count mismatch!');
  process.exit(1);
}

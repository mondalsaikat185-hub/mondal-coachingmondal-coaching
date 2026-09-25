'use strict';
// READ-ONLY diagnostic for exam notifications. Opens the DB read-only; prints no names/phones/tokens.
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync((process.env.DATA_DIR || '/data') + '/mc2.db', { readOnly: true });
const rows = s => db.prepare('SELECT data FROM rows WHERE sheet = ? ORDER BY rk').all(s).map(r => { try { return JSON.parse(r.data); } catch (e) { return {}; } });
const pm = v => { if (!v) return {}; if (typeof v === 'object') return v; try { return JSON.parse(v) || {}; } catch (e) { return {}; } };
const lib = rows('library'); const byId = {}; lib.forEach(i => byId[String(i.id)] = i);
const t = i => i ? `${i.type || '?'}|${(i.title || '').slice(0, 50)}|parent=${((byId[String(i.parentId)] || {}).title || '-').slice(0, 30)}|created=${String(i.createdAt || '').slice(0, 16)}` : 'MISSING';
console.log('## batches');
for (const b of rows('batches')) {
  const a = pm(b.assignedItemsMap), s = pm(b.scheduledStartTimeMap);
  console.log(`- ${b.id} "${b.name}" classDay=${b.classDay || ''} time=${b.examStartTime || ''} assigned=${Object.keys(a).length} scheduled=${Object.keys(s).length}`);
}
for (const b of rows('batches').filter(b => /sakal|morning/i.test(b.name || '') && /aug|আগস্ট/i.test(b.name || ''))) {
  const a = pm(b.assignedItemsMap), s = pm(b.scheduledStartTimeMap);
  console.log(`\n## batch ${b.name}: last 40 assigned (newest first)`);
  Object.entries(a).sort((x, y) => String(y[1]).localeCompare(String(x[1]))).slice(0, 40)
    .forEach(([id, d]) => console.log(`${String(d).slice(0, 16)} | ${t(byId[id])} | sched=${s[id] || ''}`));
  console.log(`\n## batch ${b.name}: scheduled values (distinct, count)`);
  const c = {}; Object.values(s).forEach(v => c[String(v).slice(0, 16)] = (c[String(v).slice(0, 16)] || 0) + 1);
  Object.entries(c).sort().forEach(([k, n]) => console.log(k, n));
}
console.log('\n## library items with hormone/regression/test in title');
lib.filter(i => /hormon|হরমোন|regression|\btest\b/i.test(i.title || '')).forEach(i => console.log(`${i.id} | ${t(i)}`));
console.log('\n## exams: cloze / passage / comprehension / para jumble (first 60)');
lib.filter(i => i.type === 'exam' && /cloze|passage|compre|jumbl|para/i.test(i.title || '')).slice(0, 60).forEach(i => console.log(`${i.id} | ${t(i)}`));
console.log('\n## exam_request notifications');
rows('notifications').filter(n => n.type === 'exam_request').forEach(n => console.log(`${n.id} batch=${n.batchId} date=${n.examDate} status=${n.status} exams=${n.examIds}`));

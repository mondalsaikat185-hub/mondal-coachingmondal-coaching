// tools/link_notes_exams.mjs
// TASK R26: Link Library Notes <-> Exams permanently in SQLite.
// Usage:
//   node tools/link_notes_exams.mjs [_dbcopy/mc2_snapshot.db] [--dry-run|--apply]

import { DatabaseSync } from 'node:sqlite';
import { argv } from 'node:process';

const args = argv.slice(2);
let dbPath = '_dbcopy/mc2_snapshot.db';
let isApply = false;

for (const arg of args) {
  if (arg === '--apply') isApply = true;
  else if (arg === '--dry-run') isApply = false;
  else if (!arg.startsWith('--')) dbPath = arg;
}

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA busy_timeout=10000;');

const rawRows = db.prepare("SELECT rk, data FROM rows WHERE sheet='library'").all();
const byId = {};
const allItems = [];

for (const r of rawRows) {
  try {
    const d = JSON.parse(r.data);
    d.__rk = r.rk;
    byId[d.id] = d;
    allItems.push(d);
  } catch (err) {
    console.error(`Invalid JSON in library rk=${r.rk}:`, err.message);
  }
}

const isFolder = d => d.type === 'folder' || String(d.isFolder).toLowerCase() === 'true';
const notes = allItems.filter(r => (r.type === 'note' || r.type === 'pdf') && !isFolder(r));
const exams = allItems.filter(r => r.type === 'exam' && !isFolder(r));

function pathOf(item) {
  const parts = [];
  let curr = item;
  let guard = 0;
  while (curr && guard++ < 30) {
    parts.unshift(curr.title || '');
    curr = curr.parentId ? byId[curr.parentId] : null;
  }
  return parts.join(' / ');
}

function parentFolder(item) {
  return item.parentId ? byId[item.parentId] : null;
}

// STOP WORDS & TITLE NORMALIZATION
const STOP_WORDS = /\b(from|to|set|part|mock|test|exam|sheet|english|bengali|mcqs?|level|easy|moderate|high|master|note|notes|info)\b/gi;

function normTitle(s) {
  return String(s || '').normalize('NFC').toLowerCase()
    .replace(STOP_WORDS, ' ')
    .replace(/[^\p{L}\p{M}\p{N}]/gu, '');
}

// Tokenization for English/Bengali words
function cleanTokens(s) {
  return String(s || '')
    .normalize('NFC').toLowerCase()
    .replace(/^\s*\d+[\s._-]+/, '') // remove leading 02-, 1-, etc.
    .replace(/[-_]+/g, ' ')
    .replace(/\b(o|and|of|the|part|set|pt|in|to|from|master|note|notes|info|related)\b/gi, ' ')
    .replace(/s\b/g, '') // remove trailing plural s (e.g. schemes -> scheme)
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 1 || /[\d০-৯]/.test(w));
}

function extractParenTokens(s) {
  const m = String(s || '').match(/\(([^)]+)\)/);
  if (m) {
    return cleanTokens(m[1]);
  }
  return [];
}

// Extract Part number: 1, 2, 3, etc. (supports 1/2/3, I/II/III, ১/২/৩, ১-i, ১-ii)
function extractPartNum(s) {
  const str = String(s || '');
  let m = str.match(/\b(?:part|pt|পর্ব|সেট|set)\s*[-:–—]?\s*([0-9ivx]+(?:\s*\([a-z0-9]+\))?|[১-৯]+(?:\s*\([a-z0-9]+\))?)/i);
  if (m) {
    const raw = m[1].toLowerCase().replace(/\s+/g, '');
    return normalizePartToken(raw);
  }
  m = str.match(/([১-৯])\s*য়\s*পর্ব/);
  if (m) {
    return normalizePartToken(m[1]);
  }
  m = str.match(/\b([IVX]{1,3})\b/);
  if (m) {
    return normalizePartToken(m[1].toLowerCase());
  }
  // Title ends with a number like "Sports 2" or "Dance 1"
  m = str.match(/[\s_-]+([0-9]+)\s*$/);
  if (m) {
    return normalizePartToken(m[1]);
  }
  return null;
}

function normalizePartToken(t) {
  if (!t) return null;
  t = t.replace('১', '1').replace('২', '2').replace('৩', '3').replace('৪', '4');
  if (t === 'i') return '1';
  if (t === 'ii') return '2';
  if (t === 'iii') return '3';
  if (t === 'iv') return '4';
  if (t === '1(i)' || t === '1-i' || t === '1i') return '1-i';
  if (t === '1(ii)' || t === '1-ii' || t === '1ii') return '1-ii';
  return t;
}

// Rule d: Numeric range e.g. 151-175
function extractRange(s) {
  const m = String(s || '').match(/\b(\d+)\s*[-–—]\s*(\d+)\b/);
  if (m) return `${m[1]}-${m[2]}`;
  return null;
}

// Rule e: Month + Year for Current Affairs
const MONTHS = {
  january: 1, jan: 1,
  february: 2, feb: 2,
  march: 3, mar: 3,
  april: 4, apr: 4,
  may: 5,
  june: 6, jun: 6,
  july: 7, jul: 7,
  august: 8, aug: 8,
  september: 9, sep: 9, sept: 9,
  october: 10, oct: 10,
  november: 11, nov: 11,
  december: 12, dec: 12
};

function extractMonthYear(s, p = '') {
  const combined = `${p} ${s}`;
  const m = combined.match(/\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)\b/i);
  if (!m) return null;
  // First search for 4-digit year 20xx in combined string
  let y = combined.match(/\b(20\d\d)\b/);
  if (y) {
    return { month: MONTHS[m[1].toLowerCase()], year: y[1] };
  }
  // Otherwise search for 2-digit year, e.g. "Feb, 26" or "Jan '26" (not 9-11 or 12-14)
  y = combined.match(/(?:,\s*|'\s*|\bCA\s+[^0-9]*\s*)(2[4-9])\b/i);
  if (y) {
    return { month: MONTHS[m[1].toLowerCase()], year: '20' + y[1] };
  }
  return null;
}

// Matching logic for a note
export function matchNote(note) {
  const p = pathOf(note);

  // 1. "Mast Watch Before Starting" - 5 Formula notes -> noExamNeeded = true
  if (p.startsWith('Mast Watch Before Starting')) {
    return { rule: 'Formula নোট (noExamNeeded: true)', exams: [], noExamNeeded: true };
  }

  // 1b. SLST Education (10 notes) -> noExamNeeded = true (per Saikat approval)
  if (p.includes('SLST') || p.includes('EDUCATION')) {
    return { rule: 'SLST Education (noExamNeeded: true)', exams: [], noExamNeeded: true };
  }

  // 2. Rule f: Math's Sheet (R21)
  if (p.startsWith("Math's Sheet")) {
    const pf = parentFolder(note);
    if (pf) {
      const siblingExams = exams.filter(e => e.parentId === pf.id);
      if (siblingExams.length > 0) {
        // Sort Set 1 before Set 2
        siblingExams.sort((a, b) => String(a.title).localeCompare(String(b.title)));
        return { rule: "f. Math's Sheet নিয়ম (R21)", exams: siblingExams, noExamNeeded: false };
      }
    }
  }

  // 3. Rule e: Current Affairs Month + Year (SSC CA first, then Banking CA)
  if (/current affairs|ca/i.test(p)) {
    const nmy = extractMonthYear(note.title, p);
    if (nmy) {
      const caExams = [];
      for (const e of exams) {
        const ep = pathOf(e);
        if (!/current affairs|ca/i.test(ep)) continue;
        const emy = extractMonthYear(e.title, ep);
        if (emy && emy.month === nmy.month && emy.year === nmy.year) {
          const isSsc = /ssc ca/i.test(ep) ? 0 : 1;
          caExams.push({ exam: e, isSsc, title: e.title || '' });
        }
      }
      if (caExams.length > 0) {
        caExams.sort((a, b) => (a.isSsc - b.isSsc) || a.title.localeCompare(b.title));
        return { rule: 'e. মাস+বছর (Current Affairs)', exams: caExams.map(x => x.exam), noExamNeeded: false };
      }
    }
  }

  // 4. Rule a: normTitle exact match
  const nk = normTitle(note.title);
  if (nk.length >= 4) {
    const exactMatches = exams.filter(e => normTitle(e.title) === nk);
    if (exactMatches.length > 0) {
      return { rule: 'a. normTitle হুবহু মিল', exams: exactMatches, noExamNeeded: false };
    }
  }

  // 5. Rule b: Parentheses English tokens / clean tokens match
  // e.g. "(Notto o Shotto Bidhan)" <-> "02-notto-shotto-bidhan"
  const noteParenTokens = extractParenTokens(note.title);
  const noteCleanTokens = cleanTokens(note.title);
  const targetTokens = noteParenTokens.length > 0 ? noteParenTokens : noteCleanTokens;

  if (targetTokens.length > 0) {
    const tokenStr = targetTokens.join('');
    const bMatches = [];
    for (const e of exams) {
      const eParenTokens = extractParenTokens(e.title);
      const eCleanTokens = cleanTokens(e.title);
      const eTarget = eParenTokens.length > 0 ? eParenTokens : eCleanTokens;
      const eStr = eTarget.join('');
      if (eStr === tokenStr && eStr.length >= 4) {
        bMatches.push(e);
      }
    }
    if (bMatches.length > 0) {
      return { rule: 'b. বন্ধনীর ইংরেজি মিল', exams: bMatches, noExamNeeded: false };
    }
  }

  // 6. Rule c: Sibling exam in the same folder
  const pf = parentFolder(note);
  if (pf) {
    const siblingExams = exams.filter(e => e.parentId === pf.id);
    if (siblingExams.length === 1) {
      return { rule: 'c. একই ফোল্ডারে একক exam', exams: siblingExams, noExamNeeded: false };
    } else if (siblingExams.length > 1) {
      // Special case: Physics approved link
      if (String(note.title).includes('তড়িৎ প্রবাহ ও বিভবপ্রভেদ')) {
        const phMatch = siblingExams.find(e => String(e.title).includes('তড়িৎ প্রবাহ ও বর্তনী'));
        if (phMatch) {
          return { rule: 'c. অনুমোদিত Physics লিংক', exams: [phMatch], noExamNeeded: false };
        }
      }

      // Check part number match first if applicable
      const nPart = extractPartNum(note.title);
      if (nPart) {
        const partMatch = siblingExams.find(e => extractPartNum(e.title) === nPart);
        if (partMatch) {
          return { rule: 'c. একই ফোল্ডারে পর্ব/Part মিল', exams: [partMatch], noExamNeeded: false };
        }
      }

      // Sibling word overlap
      const noteWords = new Set(cleanTokens(note.title).concat(extractParenTokens(note.title)));
      let best = null, bestScore = -1, secondScore = -1;
      for (const e of siblingExams) {
        const eWords = cleanTokens(e.title).concat(extractParenTokens(e.title));
        let score = 0;
        for (const w of eWords) if (noteWords.has(w)) score++;
        if (score > bestScore) {
          secondScore = bestScore;
          bestScore = score;
          best = e;
        } else if (score === bestScore) {
          secondScore = score;
        }
      }
      if (best && bestScore > 0 && bestScore > secondScore) {
        return { rule: 'c. একই ফোল্ডারে শব্দ মিল', exams: [best], noExamNeeded: false };
      } else if (best) {
        return { rule: 'c. একই ফোল্ডারে একাধিক থেকে বাছাই (সন্দেহজনক)', exams: [best], noExamNeeded: false, suspicious: true };
      }
    }
  }

  // 7. Rule d: Numeric range match (Idioms / Synonyms)
  const nRange = extractRange(note.title);
  if (nRange) {
    const isSyno = /syno/i.test(p);
    const isIdiom = /idiom/i.test(p);
    const rangeMatches = exams.filter(e => {
      const er = extractRange(e.title);
      if (er !== nRange) return false;
      const ep = pathOf(e);
      if (isSyno && /syno/i.test(ep)) return true;
      if (isIdiom && /idiom/i.test(ep)) return true;
      return false;
    });
    if (rangeMatches.length > 0) {
      return { rule: 'd. সংখ্যার রেঞ্জ মিল', exams: rangeMatches, noExamNeeded: false };
    }
  }

  return { rule: 'মিলেনি', exams: [], noExamNeeded: false };
}

// Generate match results
const results = notes.map(n => ({
  note: n,
  path: pathOf(n),
  match: matchNote(n)
}));

const matched = results.filter(r => r.match.exams.length > 0 || r.match.noExamNeeded);
const unmatched = results.filter(r => r.match.exams.length === 0 && !r.match.noExamNeeded);
const suspicious = results.filter(r => r.match.suspicious);

console.log('='.repeat(80));
console.log(`DATABASE: ${dbPath}`);
console.log(`MODE: ${isApply ? 'APPLY (Live Updates)' : 'DRY-RUN (No Changes)'}`);
console.log(`TOTAL NOTES: ${notes.length}`);
console.log(`MATCHED: ${matched.length}`);
console.log(`UNMATCHED: ${unmatched.length}`);
console.log(`SUSPICIOUS: ${suspicious.length}`);
console.log('='.repeat(80));

// Rule Breakdown
const ruleCounts = {};
for (const r of results) {
  const k = r.match.rule;
  ruleCounts[k] = (ruleCounts[k] || 0) + 1;
}
console.log('\n### কোন নিয়মে কতগুলি নোট লিংক হলো:');
for (const [rName, count] of Object.entries(ruleCounts)) {
  console.log(`- ${rName}: ${count}`);
}

if (suspicious.length > 0) {
  console.log('\n### সন্দেহজনক মিল (Suspicious Matches):');
  for (const s of suspicious) {
    console.log(`- নোট: "${s.note.title}" [${s.path}]`);
    console.log(`  -> লিংক হওয়া Exam: "${s.match.exams.map(e => e.title).join(', ')}"`);
  }
}

if (unmatched.length > 0) {
  console.log('\n### ✗ Exam মিলেনি (Unmatched Notes):');
  for (const u of unmatched) {
    console.log(`- [${u.path}] "${u.note.title}"`);
  }
}

// Check if apply requested
if (isApply) {
  console.log('\n>>> APPLYING CHANGES TO DATABASE...');
  // 1. Vacuum backup first
  const bak = dbPath.replace(/\.db$/, '') + '-pre-link-' + Date.now() + '.db';
  db.exec(`VACUUM INTO '${bak.replace(/'/g, "''")}'`);
  console.log(`✓ BACKUP CREATED: ${bak}`);

  const beforeCount = db.prepare('SELECT COUNT(*) c FROM rows').get().c;
  const updStmt = db.prepare('UPDATE rows SET data = ? WHERE rk = ?');
  let updatedCount = 0;

  db.exec('BEGIN IMMEDIATE');
  try {
    for (const r of results) {
      const it = r.note;
      const d = { ...it };
      delete d.__rk;

      d.linkedExamIds = r.match.exams.map(e => e.id);
      d.noExamNeeded = !!r.match.noExamNeeded;
      d.updatedAt = new Date().toISOString();

      updStmt.run(JSON.stringify(d), it.__rk);
      updatedCount++;
    }
    db.exec('COMMIT');
    console.log(`✓ COMMITTED ${updatedCount} note updates in single transaction.`);
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('✗ TRANSACTION FAILED, ROLLED BACK:', err);
    process.exit(1);
  }

  const afterCount = db.prepare('SELECT COUNT(*) c FROM rows').get().c;
  console.log(`✓ ROW COUNT VERIFICATION: Before=${beforeCount}, After=${afterCount}`);
  if (beforeCount !== afterCount) {
    console.error('✗ CRITICAL: ROW COUNT MISMATCH!');
    process.exit(1);
  }
} else {
  console.log('\n[DRY-RUN COMPLETE] No changes written to database.');
}

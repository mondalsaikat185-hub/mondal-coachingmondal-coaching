import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ExamType, InteractiveQuizPayload } from '../types/QuizData';

export type { ExamType, InteractiveQuizPayload };

export interface Batch {
  id: string;
  name: string;
  schedule: string;
  createdAt?: any;
  classDay?: string;
  examStartTime?: string;
  examSlot?: { classDay: string; examStartTime: string };
}

export interface Note {
  id: string;
  title: string;
  contentUrl?: string; // Optional link
  createdAt?: any;
}

export interface Exam {
  id: string;
  title: string;
  examDate: string;
  examType?: ExamType; // e.g. 'Online Link', 'PDF Upload', 'Cloze Test', etc.
  contentUrl?: string; // Optional link to question paper or form
  analysisUrl?: string; // Link to detailed analysis or answer key
  quizData?: string; // Stored JSON payload for interactive quizzes
  batchId: string;
  createdAt?: any;
}

export interface Payment {
  id: string;
  studentId: string;
  studentName?: string;
  studentEmail?: string;
  amount: number;
  month: string;
  status: 'pending' | 'approved' | 'rejected';
  remarks?: string;
  transactionId?: string;
  proofImage?: string;
  paymentMode?: 'manual' | 'proof_upload' | 'gateway';
  createdAt?: any;
}

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function getMonthOptions(): string[] {
  const currentYear = new Date().getFullYear();
  return [
    ...monthNames.map(m => `${m} ${currentYear - 1}`),
    ...monthNames.map(m => `${m} ${currentYear}`),
    ...monthNames.map(m => `${m} ${currentYear + 1}`),
    ...monthNames.map(m => `${m} ${currentYear + 2}`)
  ];
}

export function getMonthPickerList(): string[] {
  const now = new Date();
  const curY = now.getFullYear();
  const curM = now.getMonth(); // 0 to 11

  const list: string[] = [];
  // 1. CURRENT month+year first!
  list.push(`${monthNames[curM]} ${curY}`);

  // 2. Previous months right below it (newest first, last 24 months)
  for (let offset = 1; offset <= 24; offset++) {
    const d = new Date(curY, curM - offset, 1);
    list.push(`${monthNames[d.getMonth()]} ${d.getFullYear()}`);
  }

  // 3. Next 2 months at the end (advance payment)
  for (let offset = 1; offset <= 2; offset++) {
    const d = new Date(curY, curM + offset, 1);
    list.push(`${monthNames[d.getMonth()]} ${d.getFullYear()}`);
  }
  return list;
}

export function validateConsecutiveRule(
  selectedMonths: string[],
  studentPayments: any[],
  studentExcusedMonths: string | string[] = ''
): { valid: boolean; missingMonth?: string } {
  const START_YEAR = 2026;
  const START_MONTH = 9; // September 2026 (1-indexed)

  const monthNamesList = ["january","february","march","april","may","june","july","august","september","october","november","december"];

  function parseYM(str: string): { y: number; m: number } | null {
    if (!str) return null;
    const s = str.toLowerCase().trim();
    const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) return { y: parseInt(slashMatch[3]), m: parseInt(slashMatch[1]) };
    const mMatch = s.match(/^([a-z]+)[\s-_]?(\d{4})$/);
    if (mMatch) {
      const idx = monthNamesList.indexOf(mMatch[1]);
      if (idx !== -1) return { y: parseInt(mMatch[2]), m: idx + 1 };
    }
    const isoMatch = s.match(/^(\d{4})[-/](\d{1,2})/);
    if (isoMatch) return { y: parseInt(isoMatch[1]), m: parseInt(isoMatch[2]) };
    return null;
  }

  // Covered months set: 'YYYY-M'
  const covered = new Set<string>();

  // 1. Existing payments (approved, pending, paid)
  studentPayments.forEach(p => {
    if (p.status === 'approved' || p.status === 'pending' || p.status === 'paid') {
      if (p.month) {
        String(p.month).split(/[,;\n]+/).forEach((m: string) => {
          const ym = parseYM(m.trim());
          if (ym) covered.add(`${ym.y}-${ym.m}`);
        });
      }
    }
  });

  // 2. Excused months
  const rawExcused = Array.isArray(studentExcusedMonths) ? studentExcusedMonths.join(', ') : String(studentExcusedMonths || '');
  rawExcused.split(/[,;\n]+/).forEach(m => {
    const ym = parseYM(m.trim());
    if (ym) covered.add(`${ym.y}-${ym.m}`);
  });

  // 3. Currently selected months in this checkout batch
  selectedMonths.forEach(m => {
    const ym = parseYM(m.trim());
    if (ym) covered.add(`${ym.y}-${ym.m}`);
  });

  // For every selected month >= Oct 2026, check if all intermediate months between Oct 2026 and that month are covered
  const startVal = START_YEAR * 12 + START_MONTH;
  for (const m of selectedMonths) {
    const targetYM = parseYM(m);
    if (!targetYM) continue;
    const targetVal = targetYM.y * 12 + targetYM.m;

    // Months before Oct 2026 are ignored and never block
    if (targetVal < startVal) continue;

    let curY = START_YEAR;
    let curM = START_MONTH;
    while ((curY * 12 + curM) < targetVal) {
      const key = `${curY}-${curM}`;
      if (!covered.has(key)) {
        const title = monthNamesList[curM - 1].charAt(0).toUpperCase() + monthNamesList[curM - 1].slice(1) + " " + curY;
        return { valid: false, missingMonth: title };
      }
      curM++;
      if (curM > 12) { curM = 1; curY++; }
    }
  }

  return { valid: true };
}

export function formatDateTimeSafe(timestamp: any): string {
  if (!timestamp) return "N/A";
  let d: Date | null = null;
  if (timestamp instanceof Date) {
    d = timestamp;
  } else if (typeof timestamp === 'number') {
    d = new Date(timestamp);
  } else if (typeof timestamp === 'string') {
    d = new Date(timestamp);
    if (isNaN(d.getTime())) {
      d = new Date(timestamp.replace(' ', 'T'));
    }
  } else if (typeof timestamp === 'object') {
    if (timestamp.seconds) {
      d = new Date(timestamp.seconds * 1000);
    } else if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      d = timestamp.toDate();
    }
  }

  if (!d || isNaN(d.getTime())) {
    return "N/A";
  }

  const dateStr = d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return `${dateStr} at ${timeStr}`;
}

export function getDueMonths(pendingMonthsCount: number, studentPayments: any[]): string {
  if (!pendingMonthsCount || pendingMonthsCount <= 0) return "";
  
  const monthOptions = getMonthOptions();

  // Find all paid/approved/pending months
  const paidMonths = studentPayments
    .filter(p => p.status === 'paid' || p.status === 'approved' || p.status === 'pending')
    .flatMap(p => p.month ? String(p.month).split(',').map((m: string) => m.trim()) : []);
    
  const paidIndices = paidMonths.map(m => monthOptions.indexOf(m)).filter(idx => idx !== -1);

  const dueMonths: string[] = [];
  const today = new Date();
  const currentMonthStr = `${monthNames[today.getMonth()]} ${today.getFullYear()}`;
  const currentMonthIdx = monthOptions.indexOf(currentMonthStr);
  
  // Walk BACKWARDS from the current month and collect the most recent unpaid months
  // (so the current month/year is always included and old 2025 months are not shown first).
  const startIdx = currentMonthIdx !== -1 ? currentMonthIdx : monthOptions.length - 1;
  for (let idx = startIdx; idx >= 0 && dueMonths.length < pendingMonthsCount; idx--) {
    if (!paidIndices.includes(idx)) {
      dueMonths.push(monthOptions[idx]);
    }
  }
  dueMonths.reverse(); // show oldest → current

  if (dueMonths.length === 0) return `${pendingMonthsCount} month(s)`;
  return dueMonths.join(', ');
}

export function PageHeader({ title, backTo, description, onBack }: { title: string, backTo?: string, description?: string, onBack?: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col mb-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={onBack ? onBack : () => backTo && navigate(backTo)}
          className="p-2 border-2 border-zinc-900 dark:border-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl sm:text-3xl font-black italic uppercase leading-none">{title}</h2>
          {description && <p className="text-sm font-bold text-zinc-500 mt-1">{description}</p>}
        </div>
      </div>
    </div>
  );
}



export { AdminStudents } from './AdminStudents';
export { AdminBatches } from './AdminBatches';
export { AdminPayments } from './AdminPayments';
export { StudentPayments } from './StudentPayments';

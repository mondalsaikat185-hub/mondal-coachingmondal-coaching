import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, X, AlertTriangle, CalendarDays, Clock } from 'lucide-react';
import { api, ExamRequestOptions } from '../lib/api';
import { showToast } from '../lib/toast';
import { useBackStep } from '../lib/useBackStep';

// "Add / Edit Notification for Exam": date (DD/MM/YYYY) -> batch -> exam checkboxes -> preview -> Post / Update.
// The server stores {batchId, examDate, examStartTime, examIds[]} and schedules the start time itself.

const DAY_NAMES = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
const pad = (n: number) => String(n).padStart(2, '0');
const toDmy = (iso: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const dowOf = (iso: string) => new Date(iso + 'T00:00:00Z').getUTCDay();

function parseIds(v: any): string[] {
  if (Array.isArray(v)) return v.map(String);
  try {
    const a = JSON.parse(v || '[]');
    return Array.isArray(a) ? a.map(String) : [];
  } catch (e) {
    return [];
  }
}

type Props = {
  user: any;
  batches: any[];
  editNotification?: any | null;
  onClose: () => void;
  onPosted: () => void;
};

export function ExamNotificationForm({ user, batches, editNotification, onClose, onPosted }: Props) {
  const isAdmin = user?.role === 'admin';
  const isEdit = Boolean(editNotification && editNotification.id);
  const myBatchIds: string[] = String(user?.batchId || '').split(',').map((s: string) => s.trim()).filter(Boolean);
  const batchChoices = useMemo(
    () => (isAdmin ? batches : batches.filter(b => myBatchIds.includes(b.id))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [batches, isAdmin, user?.batchId]
  );

  const initialDateIso = editNotification?.examDate ? String(editNotification.examDate).trim() : '';

  const [batchId, setBatchId] = useState<string>(editNotification?.batchId || '');
  const [dd, setDd] = useState<string>(initialDateIso ? initialDateIso.slice(8, 10) : '');
  const [mm, setMm] = useState<string>(initialDateIso ? initialDateIso.slice(5, 7) : '');
  const [yyyy, setYyyy] = useState<string>(initialDateIso ? initialDateIso.slice(0, 4) : '');
  const [examTime, setExamTime] = useState<string>(editNotification?.examStartTime || '');
  const [opts, setOpts] = useState<ExamRequestOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string[]>(() => {
    if (editNotification?.examIds) {
      return parseIds(editNotification.examIds);
    }
    return [];
  });
  const [step, setStep] = useState<'form' | 'preview'>('form');
  const [posting, setPosting] = useState(false);

  // Search & Filter state for "সব পরীক্ষা থেকে বেছে নিন"
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');

  // Mobile Back Button steps
  useBackStep('notif_preview_step', step === 'preview', () => {
    setStep('form');
  });
  useBackStep('notif_form_modal', step === 'form', onClose);

  useEffect(() => {
    if (!batchId && batchChoices.length === 1) setBatchId(batchChoices[0].id);
  }, [batchChoices, batchId]);

  const dateIso = dd && mm && yyyy ? `${yyyy}-${mm}-${dd}` : '';
  const dateValid = !!dateIso && Number(dd) <= daysInMonth(Number(yyyy), Number(mm));

  // Batch chosen -> load options; first time also fills the default date (next class day) and default time
  useEffect(() => {
    if (!batchId) { setOpts(null); return; }
    let cancelled = false;
    setLoading(true); setError('');
    api.getExamRequestOptions(batchId, dateValid ? dateIso : '')
      .then(o => {
        if (cancelled) return;
        setOpts(o);
        if (!dateValid && o.defaultDate && !isEdit) {
          setYyyy(o.defaultDate.slice(0, 4)); setMm(o.defaultDate.slice(5, 7)); setDd(o.defaultDate.slice(8, 10));
        }
        if (o.examStartTime && !examTime && !isEdit) {
          setExamTime(o.examStartTime);
        }
        // Retain selected items (including ones from allExams or editNotification)
        setSelected(prev => {
          if (isEdit) return prev;
          return prev.filter(id => o.exams.some(e => e.id === id) || (o.allExams && o.allExams.some(e => e.id === id)));
        });
      })
      .catch(e => { if (!cancelled) setError(String(e?.message || e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId, dateValid ? dateIso : '']);

  const nowYear = new Date().getFullYear();
  const years = [nowYear, nowYear + 1];
  const maxDay = yyyy && mm ? daysInMonth(Number(yyyy), Number(mm)) : 31;

  // Group homework exams by class day (newest first — the server already sorts)
  const groups = useMemo(() => {
    const g: { date: string; items: ExamRequestOptions['exams'] }[] = [];
    (opts?.exams || []).forEach(e => {
      const last = g[g.length - 1];
      if (last && last.date === e.classDate) last.items.push(e); else g.push({ date: e.classDate, items: [e] });
    });
    return g;
  }, [opts]);

  // Subjects for chips
  const subjects = useMemo(() => {
    if (!opts?.allExams) return [];
    const set = new Set<string>();
    opts.allExams.forEach(e => { if (e.subject) set.add(e.subject); });
    return ['All', ...Array.from(set).sort()];
  }, [opts?.allExams]);

  // Filtered allExams (at most 50 rows)
  const filteredAllExams = useMemo(() => {
    if (!opts?.allExams) return [];
    const q = searchQuery.trim().toLowerCase();
    return opts.allExams
      .filter(e => {
        if (selectedSubject !== 'All' && e.subject !== selectedSubject) return false;
        if (q) {
          const matchTitle = (e.title || '').toLowerCase().includes(q);
          const matchFolder = (e.folderPath || '').toLowerCase().includes(q);
          if (!matchTitle && !matchFolder) return false;
        }
        return true;
      })
      .slice(0, 50);
  }, [opts?.allExams, searchQuery, selectedSubject]);

  const titleOf = (id: string) => {
    const hw = opts?.exams.find(e => e.id === id);
    if (hw) return hw.title;
    const all = opts?.allExams?.find(e => e.id === id);
    if (all) return all.title;
    return id;
  };

  const series = opts?.series || [];
  const total = selected.length + series.length;

  const toggle = (id: string) => {
    if (!dd && opts?.defaultDate) {
      setYyyy(opts.defaultDate.slice(0, 4));
      setMm(opts.defaultDate.slice(5, 7));
      setDd(opts.defaultDate.slice(8, 10));
    }
    if (!examTime && opts?.examStartTime) {
      setExamTime(opts.examStartTime);
    }
    setSelected(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]));
  };

  const wrongDay = dateValid && opts?.classDay !== '' && opts?.classDay !== undefined && String(dowOf(dateIso)) !== opts.classDay;

  const post = async () => {
    if (posting || !dateValid || !batchId || total === 0 || !examTime) return;
    setPosting(true);
    try {
      if (isEdit) {
        const res = await api.updateExamNotification({
          id: editNotification.id,
          examDate: dateIso,
          examStartTime: examTime,
          examIds: selected,
        });
        if (res && res.success === false) {
          showToast(res.error || 'আপডেট ব্যর্থ হয়েছে', 'error', 5000);
          return;
        }
        showToast('Exam notification আপডেট হয়েছে ✓');
        onPosted();
      } else {
        const saved = await api.createExamNotification({ batchId, examDate: dateIso, examStartTime: examTime, examIds: selected });
        if (saved?.status === 'duplicate') showToast('এই batch ও তারিখের জন্য আগেই পোস্ট আছে — এটি duplicate হিসেবে রাখা হলো', 'info', 5000);
        else showToast('Exam notification পোস্ট হয়েছে ✓');
        onPosted();
      }
    } catch (e: any) {
      showToast(String(e?.message || e || (isEdit ? 'আপডেট ব্যর্থ' : 'পোস্ট ব্যর্থ')), 'error', 5000);
    } finally {
      setPosting(false);
    }
  };

  const sel = 'bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-100 p-2 text-sm font-bold';

  return (
    <div className="border-4 border-black dark:border-zinc-100 p-4 bg-zinc-50 dark:bg-zinc-800/50 flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <h3 className="font-black uppercase text-sm flex items-center gap-1">
          <CalendarDays className="w-4 h-4" /> {isEdit ? 'Edit Notification for Exam' : 'Add Notification for Exam'}
        </h3>
        <button type="button" onClick={onClose} className="p-1 border-2 border-black dark:border-zinc-100"><X className="w-4 h-4" /></button>
      </div>

      {step === 'form' && (
        <>
          <label className="text-xs font-black uppercase">Batch</label>
          {batchChoices.length === 0 ? (
            <p className="text-sm font-bold text-red-600">আপনার কোনো batch নেই।</p>
          ) : (
            <select
              value={batchId}
              disabled={isEdit}
              onChange={e => { setBatchId(e.target.value); setDd(''); setMm(''); setYyyy(''); setSelected([]); }}
              className={sel}
            >
              <option value="">— batch বেছে নিন —</option>
              {batchChoices.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}

          <label className="text-xs font-black uppercase">Exam তারিখ (DD / MM / YYYY)</label>
          <div className="flex gap-2">
            <select aria-label="Day" value={dd} onChange={e => setDd(e.target.value)} className={sel + ' flex-1'}>
              <option value="">DD</option>
              {Array.from({ length: maxDay }, (_, i) => pad(i + 1)).map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select aria-label="Month" value={mm} onChange={e => setMm(e.target.value)} className={sel + ' flex-1'}>
              <option value="">MM</option>
              {Array.from({ length: 12 }, (_, i) => pad(i + 1)).map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select aria-label="Year" value={yyyy} onChange={e => setYyyy(e.target.value)} className={sel + ' flex-1'}>
              <option value="">YYYY</option>
              {years.map(y => <option key={y} value={String(y)}>{y}</option>)}
            </select>
          </div>

          <label className="text-xs font-black uppercase">Exam শুরুর সময় (IST)</label>
          <div className="flex gap-2 items-center">
            <input
              type="time"
              aria-label="Exam Time"
              value={examTime}
              onChange={e => setExamTime(e.target.value)}
              className={sel + ' flex-1'}
            />
          </div>
          {examTime ? (
            <p className="text-xs font-bold text-zinc-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Exam শুরু হবে {examTime}-এ (IST) {dateValid ? `(${DAY_NAMES[dowOf(dateIso)]})` : ''}
            </p>
          ) : (
            batchId && <p className="text-xs font-bold text-amber-600">Exam শুরুর সময় দিন (উদা: 08:05, 14:05)</p>
          )}
          {wrongDay && <p className="text-xs font-bold text-amber-700 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> এই দিনটি batch-এর ক্লাসের দিন নয় — নিশ্চিত তো?</p>}
          {!isEdit && opts?.existing && <p className="text-xs font-bold text-amber-700 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> এই batch ও তারিখে আগেই পোস্ট আছে ({opts.existing.senderName || '—'})। আবার পোস্ট করলে duplicate হবে।</p>}

          {/* Selected Exams as Removable Chips */}
          {selected.length > 0 && (
            <div className="flex flex-col gap-1 p-2 bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-300 dark:border-zinc-700">
              <span className="text-[10px] font-black uppercase text-zinc-600 dark:text-zinc-400">
                বেছে নেওয়া পরীক্ষা ({selected.length}টি):
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                {selected.map(id => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-400 dark:border-zinc-600 rounded shadow-sm"
                  >
                    <span className="truncate max-w-[200px]">{titleOf(id)}</span>
                    <button
                      type="button"
                      onClick={() => toggle(id)}
                      className="text-red-500 hover:text-red-700 font-black ml-1 text-sm leading-none"
                      title="বাদ দিন"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {batchId && dateValid && series.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-black uppercase">নিয়মিত পরীক্ষা (নিজে থেকে যোগ হবে)</label>
              {series.map(s => (
                <label key={s.id} className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-300 dark:border-zinc-700 p-2 opacity-80 cursor-not-allowed">
                  <input type="checkbox" className="w-4 h-4" checked disabled readOnly />
                  <span className="text-sm font-bold">{s.title} <span className="text-[10px] font-black uppercase text-zinc-500">🔒 auto</span></span>
                </label>
              ))}
            </div>
          )}

          {batchId && dateValid && opts?.missingExams && opts.missingExams.length > 0 && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 p-3">
              <div className="text-xs font-black text-amber-800 dark:text-amber-300">⚠️ এই note-গুলোর exam এখনো তৈরি হয়নি</div>
              <ul className="mt-1 text-sm font-semibold text-amber-900 dark:text-amber-200 list-disc pl-5">
                {opts.missingExams.map(m => <li key={m.id}>{m.title}</li>)}
              </ul>
              <div className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-1">পোস্ট করলে এগুলোর নাম Admin-এর কাছে আলাদা করে চলে যাবে।</div>
            </div>
          )}

          {/* Section 1: Homework Suggestions */}
          {batchId && dateValid && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-black uppercase">নতুন পড়ার Exams (Homework প্রস্তাব)</label>
              {loading && <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />}
              {error && <p className="text-xs font-bold text-red-600">{error}</p>}
              {!loading && !error && groups.length === 0 && <p className="text-sm font-bold text-zinc-500">কোনো নতুন homework exam নেই।</p>}
              {groups.map(g => (
                <div key={g.date} className="flex flex-col gap-1">
                  <p className="text-[10px] font-black uppercase text-zinc-500">ক্লাস: {toDmy(g.date)}</p>
                  {g.items.map(ex => (
                    <label key={ex.id} className="flex items-start gap-2 bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700 p-2 cursor-pointer">
                      <input type="checkbox" className="mt-1 w-4 h-4" checked={selected.includes(ex.id)} onChange={() => toggle(ex.id)} />
                      <span className="text-sm font-bold">{ex.title}{ex.note ? <span className="block text-[10px] font-medium text-zinc-500">📄 {ex.note}</span> : ex.folder ? <span className="block text-[10px] font-medium text-zinc-500">📁 {ex.folder}</span> : null}</span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Section 2: সব পরীক্ষা থেকে বেছে নিন */}
          {batchId && dateValid && opts?.allExams && opts.allExams.length > 0 && (
            <div className="flex flex-col gap-2 mt-2 pt-2 border-t-2 border-zinc-300 dark:border-zinc-700">
              <label className="text-xs font-black uppercase text-zinc-700 dark:text-zinc-300">
                সব পরীক্ষা থেকে বেছে নিন
              </label>
              {/* Search Box */}
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="পরীক্ষার নাম বা ফোল্ডার দিয়ে খুঁজুন..."
                className={sel + ' text-xs py-1.5'}
              />
              {/* Subject Filter Chips */}
              <div className="flex flex-wrap gap-1">
                {subjects.map(sub => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setSelectedSubject(sub)}
                    className={`px-2 py-0.5 text-xs font-black rounded border transition-colors ${
                      selectedSubject === sub
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-black dark:border-white'
                        : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-300 dark:border-zinc-600'
                    }`}
                  >
                    {sub === 'All' ? 'সব বিষয়' : sub}
                  </button>
                ))}
              </div>
              {/* List of at most 50 exams */}
              <div className="flex flex-col gap-1 max-h-60 overflow-y-auto pr-1">
                {filteredAllExams.length === 0 ? (
                  <p className="text-xs font-bold text-zinc-500 p-2">কোনো পরীক্ষা মেলেনি।</p>
                ) : (
                  filteredAllExams.map(ex => (
                    <label
                      key={ex.id}
                      className={`flex items-start gap-2 p-2 border-2 cursor-pointer transition-colors ${
                        selected.includes(ex.id)
                          ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 dark:border-blue-500'
                          : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-1 w-4 h-4"
                        checked={selected.includes(ex.id)}
                        onChange={() => toggle(ex.id)}
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold leading-snug">{ex.title}</span>
                        <span className="text-[10px] font-medium text-zinc-500 truncate">
                          {ex.subject ? `[${ex.subject}] ` : ''}{ex.folderPath}
                        </span>
                      </div>
                    </label>
                  ))
                )}
                {opts.allExams.length > 50 && filteredAllExams.length === 50 && (
                  <p className="text-[10px] font-bold text-zinc-400 text-center py-1">
                    প্রথম 50টি দেখানো হচ্ছে — নির্দিষ্ট পরীক্ষা পেতে ওপরের বক্সে নাম খুঁজুন।
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end mt-2">
            <button type="button" onClick={onClose} className="text-xs font-bold uppercase py-2 px-3 border-2 border-zinc-900">Cancel</button>
            <button
              type="button"
              disabled={!dateValid || !batchId || total === 0 || !examTime}
              onClick={() => setStep('preview')}
              className="text-xs font-black uppercase py-2 px-4 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 disabled:opacity-50"
            >
              Preview ({total})
            </button>
          </div>
        </>
      )}

      {step === 'preview' && (
        <>
          <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-100 p-3 flex flex-col gap-2">
            <p className="text-sm font-black">{opts?.batchName} — {toDmy(dateIso)} ({DAY_NAMES[dowOf(dateIso)]}) {examTime}</p>
            {series.map((s, i) => (
              <div key={s.id} className="flex justify-between items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-1">
                <span className="text-sm font-bold">{i + 1}. {s.title}</span>
                <span className="text-[10px] font-black uppercase text-zinc-500">🔒 auto</span>
              </div>
            ))}
            {selected.map((id, i) => (
              <div key={id} className="flex justify-between items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-1">
                <span className="text-sm font-bold">{series.length + i + 1}. {titleOf(id)}</span>
                <button type="button" onClick={() => setSelected(s => s.filter(x => x !== id))} className="text-[10px] font-black uppercase text-red-600 px-2 py-1 border border-red-300">বাদ দিন</button>
              </div>
            ))}
            {!isEdit && opts?.existing && <p className="text-xs font-bold text-amber-700">⚠️ এই batch ও তারিখে আগেই পোস্ট আছে — এটি duplicate হিসেবে থাকবে।</p>}
            <p className="text-[11px] font-medium text-zinc-500">
              পরীক্ষা শুরু হওয়ার আগে পর্যন্ত আপনি তারিখ, সময় ও exam বদলাতে পারবেন। শুধু Admin মুছতে পারবেন।
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setStep('form')} className="text-xs font-bold uppercase py-2 px-3 border-2 border-zinc-900">Back</button>
            <button
              type="button"
              disabled={posting || total === 0}
              onClick={post}
              className="text-xs font-black uppercase py-2 px-4 bg-emerald-600 text-white disabled:opacity-50 flex items-center gap-1"
            >
              {posting && <Loader2 className="w-3 h-3 animate-spin" />} {isEdit ? 'Update' : 'Post'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

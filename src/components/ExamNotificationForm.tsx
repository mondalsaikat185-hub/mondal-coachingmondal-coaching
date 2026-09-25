import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, X, AlertTriangle, CalendarDays } from 'lucide-react';
import { api, ExamRequestOptions } from '../lib/api';
import { showToast } from '../lib/toast';

// "Add Notification for Exam": date (DD/MM/YYYY) -> batch -> exam checkboxes -> preview -> Post.
// The server stores {batchId, examDate, examIds[]} and schedules the start time itself.

const DAY_NAMES = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
const pad = (n: number) => String(n).padStart(2, '0');
const toDmy = (iso: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const dowOf = (iso: string) => new Date(iso + 'T00:00:00Z').getUTCDay();

type Props = {
  user: any;
  batches: any[];
  onClose: () => void;
  onPosted: () => void;
};

export function ExamNotificationForm({ user, batches, onClose, onPosted }: Props) {
  const isAdmin = user?.role === 'admin';
  const myBatchIds: string[] = String(user?.batchId || '').split(',').map((s: string) => s.trim()).filter(Boolean);
  const batchChoices = useMemo(
    () => (isAdmin ? batches : batches.filter(b => myBatchIds.includes(b.id))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [batches, isAdmin, user?.batchId]
  );

  const [batchId, setBatchId] = useState<string>('');
  const [dd, setDd] = useState('');
  const [mm, setMm] = useState('');
  const [yyyy, setYyyy] = useState('');
  const [opts, setOpts] = useState<ExamRequestOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [step, setStep] = useState<'form' | 'preview'>('form');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!batchId && batchChoices.length === 1) setBatchId(batchChoices[0].id);
  }, [batchChoices, batchId]);

  const dateIso = dd && mm && yyyy ? `${yyyy}-${mm}-${dd}` : '';
  const dateValid = !!dateIso && Number(dd) <= daysInMonth(Number(yyyy), Number(mm));

  // Batch chosen -> load options; first time also fills the default date (next class day)
  useEffect(() => {
    if (!batchId) { setOpts(null); return; }
    let cancelled = false;
    setLoading(true); setError('');
    api.getExamRequestOptions(batchId, dateValid ? dateIso : '')
      .then(o => {
        if (cancelled) return;
        setOpts(o);
        if (!dateValid && o.defaultDate) {
          setYyyy(o.defaultDate.slice(0, 4)); setMm(o.defaultDate.slice(5, 7)); setDd(o.defaultDate.slice(8, 10));
        }
        setSelected(prev => prev.filter(id => o.exams.some(e => e.id === id)));
      })
      .catch(e => { if (!cancelled) setError(String(e?.message || e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId, dateValid ? dateIso : '']);

  const nowYear = new Date().getFullYear();
  const years = [nowYear, nowYear + 1];
  const maxDay = yyyy && mm ? daysInMonth(Number(yyyy), Number(mm)) : 31;

  // Group exams by class day (newest first — the server already sorts)
  const groups = useMemo(() => {
    const g: { date: string; items: ExamRequestOptions['exams'] }[] = [];
    (opts?.exams || []).forEach(e => {
      const last = g[g.length - 1];
      if (last && last.date === e.classDate) last.items.push(e); else g.push({ date: e.classDate, items: [e] });
    });
    return g;
  }, [opts]);

  const titleOf = (id: string) => opts?.exams.find(e => e.id === id)?.title || id;
  const series = opts?.series || [];
  const total = selected.length + series.length;
  const toggle = (id: string) => setSelected(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]));
  const wrongDay = dateValid && opts?.classDay !== '' && opts?.classDay !== undefined && String(dowOf(dateIso)) !== opts.classDay;

  const post = async () => {
    if (posting || !dateValid || !batchId || total === 0) return;
    setPosting(true);
    try {
      const saved = await api.createExamNotification({ batchId, examDate: dateIso, examIds: selected });
      if (saved?.status === 'duplicate') showToast('এই batch ও তারিখের জন্য আগেই পোস্ট আছে — এটি duplicate হিসেবে রাখা হলো', 'info', 5000);
      else showToast('Exam notification পোস্ট হয়েছে ✓');
      onPosted();
    } catch (e: any) {
      showToast(String(e?.message || e || 'পোস্ট ব্যর্থ'), 'error', 5000);
    } finally {
      setPosting(false);
    }
  };

  const sel = 'bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-100 p-2 text-sm font-bold';

  return (
    <div className="border-4 border-black dark:border-zinc-100 p-4 bg-zinc-50 dark:bg-zinc-800/50 flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <h3 className="font-black uppercase text-sm flex items-center gap-1"><CalendarDays className="w-4 h-4" /> Add Notification for Exam</h3>
        <button type="button" onClick={onClose} className="p-1 border-2 border-black dark:border-zinc-100"><X className="w-4 h-4" /></button>
      </div>

      {step === 'form' && (
        <>
          <label className="text-xs font-black uppercase">Batch</label>
          {batchChoices.length === 0 ? (
            <p className="text-sm font-bold text-red-600">আপনার কোনো batch নেই।</p>
          ) : (
            <select value={batchId} onChange={e => { setBatchId(e.target.value); setDd(''); setMm(''); setYyyy(''); setSelected([]); }} className={sel}>
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
          {dateValid && (
            <p className="text-xs font-bold text-zinc-500">
              {DAY_NAMES[dowOf(dateIso)]}{opts?.examStartTime ? ` · exam খুলবে ${opts.examStartTime}-এ` : ''}
            </p>
          )}
          {wrongDay && <p className="text-xs font-bold text-amber-700 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> এই দিনটি batch-এর ক্লাসের দিন নয় — নিশ্চিত তো?</p>}
          {batchId && opts && !opts.examStartTime && <p className="text-xs font-bold text-red-600">এই batch-এর exam সময় সেট করা নেই — Admin → Batches-এ সেট করতে হবে।</p>}
          {opts?.existing && <p className="text-xs font-bold text-amber-700 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> এই batch ও তারিখে আগেই পোস্ট আছে ({opts.existing.senderName || '—'})। আবার পোস্ট করলে duplicate হবে।</p>}

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

          {batchId && dateValid && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-black uppercase">নতুন পড়ার Exams (বেছে নিন)</label>
              {loading && <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />}
              {error && <p className="text-xs font-bold text-red-600">{error}</p>}
              {!loading && !error && groups.length === 0 && <p className="text-sm font-bold text-zinc-500">কোনো নতুন exam নেই।</p>}
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

          <div className="flex gap-2 justify-end mt-2">
            <button type="button" onClick={onClose} className="text-xs font-bold uppercase py-2 px-3 border-2 border-zinc-900">Cancel</button>
            <button type="button" disabled={!dateValid || !batchId || total === 0 || !opts?.examStartTime} onClick={() => setStep('preview')}
              className="text-xs font-black uppercase py-2 px-4 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 disabled:opacity-50">
              Preview ({total})
            </button>
          </div>
        </>
      )}

      {step === 'preview' && (
        <>
          <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-100 p-3 flex flex-col gap-2">
            <p className="text-sm font-black">{opts?.batchName} — {toDmy(dateIso)} ({DAY_NAMES[dowOf(dateIso)]}) {opts?.examStartTime}</p>
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
            {opts?.existing && <p className="text-xs font-bold text-amber-700">⚠️ এই batch ও তারিখে আগেই পোস্ট আছে — এটি duplicate হিসেবে থাকবে।</p>}
            <p className="text-[11px] font-medium text-zinc-500">পোস্ট করার পরে আপনি আর বদলাতে/মুছতে পারবেন না — শুধু Admin পারবেন।</p>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setStep('form')} className="text-xs font-bold uppercase py-2 px-3 border-2 border-zinc-900">Edit</button>
            <button type="button" disabled={posting || total === 0} onClick={post}
              className="text-xs font-black uppercase py-2 px-4 bg-emerald-600 text-white disabled:opacity-50 flex items-center gap-1">
              {posting && <Loader2 className="w-3 h-3 animate-spin" />} Post
            </button>
          </div>
        </>
      )}
    </div>
  );
}

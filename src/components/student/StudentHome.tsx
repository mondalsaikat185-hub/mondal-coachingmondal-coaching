import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, Lock, FileText, BookOpen, CheckCircle2, IndianRupee, Trophy, BellPlus } from 'lucide-react';
import { api } from '../../lib/api';
import { ExtraKnowledgeCard } from '../ExtraKnowledgeCard';
import { greetingFor, firstName } from './greeting';

type Props = {
  user: any;
  absentCount: number;
  paymentStatus: { status: string; label: string; remarks?: string };
  dueMonthsText?: string;
};

type LastExam = { examId?: string; title?: string; score?: number; totalQuestions?: number; correct?: number; wrong?: number; skipped?: number; submittedAt?: string };

function parseJson<T>(v: any): T | null {
  if (!v) return null;
  if (typeof v === 'object') return v as T;
  try { return JSON.parse(v) as T; } catch (e) { return null; }
}
const pad = (n: number) => String(n).padStart(2, '0');
const fmtDay = (d: Date) => d.toLocaleDateString('en-IN', { weekday: 'long' });
const fmtDate = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtTime = (d: Date) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
const fmtShort = (iso?: string) => { const d = iso ? new Date(iso) : null; return d && !isNaN(d.getTime()) ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''; };

export function StudentHome({ user, absentCount, paymentStatus, dueMonthsText }: Props) {
  const [batches, setBatches] = useState<any[]>([]);
  const [library, setLibrary] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [profileLast, setProfileLast] = useState<LastExam | null>(() => parseJson<LastExam>(user?.lastExam));
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    api.getBatches(user?.uid).then(b => { if (alive) setBatches(b || []); }).catch(() => {});
    api.getLibrary(user?.uid).then(l => { if (alive) setLibrary(l || []); }).catch(() => {});
    api.getExamResults(user?.uid).then(r => { if (alive) setResults(r || []); }).catch(() => {});
    api.getMyProfile().then((p: any) => { if (alive) { const le = parseJson<LastExam>(p?.lastExam); if (le) setProfileLast(le); } }).catch(() => {});
    const t = window.setInterval(() => setNow(Date.now()), 30000);
    return () => { alive = false; window.clearInterval(t); };
  }, [user?.uid]);

  const myBatches = useMemo(() => {
    const ids = String(user?.batchId || '').split(',').map((s: string) => s.trim()).filter(Boolean);
    return batches.filter(b => ids.includes(b.id));
  }, [batches, user?.batchId]);
  const byId = useMemo(() => { const m: Record<string, any> = {}; library.forEach(i => { m[i.id] = i; }); return m; }, [library]);

  // Next exam: earliest start time still in the future across the student's batches
  const nextExam = useMemo(() => {
    let best: number | null = null;
    const groups: Record<number, string[]> = {};
    myBatches.forEach(b => {
      const sched = b.scheduledStartTimeMap || {};
      Object.keys(sched).forEach(id => {
        const t = new Date(sched[id]).getTime();
        if (isNaN(t) || t <= now) return;
        (groups[t] = groups[t] || []).push(id);
        if (best === null || t < best) best = t;
      });
    });
    if (best === null) return null;
    const ids = Array.from(new Set(groups[best]));
    return { at: new Date(best), items: ids.map(id => byId[id]).filter(Boolean) };
  }, [myBatches, byId, now]);

  // Newest material shared to the student's batches (by the day it was shared)
  const fresh = useMemo(() => {
    const seen: Record<string, number> = {};
    myBatches.forEach(b => {
      const a = b.assignedItemsMap || {};
      Object.keys(a).forEach(id => { const t = new Date(a[id]).getTime(); if (!isNaN(t) && (!seen[id] || t > seen[id])) seen[id] = t; });
    });
    return Object.keys(seen)
      .map(id => ({ item: byId[id], at: seen[id] }))
      .filter(x => x.item && !x.item.isFolder && x.item.type !== 'folder')
      .sort((a, b) => b.at - a.at)
      .slice(0, 10);
  }, [myBatches, byId]);

  const last: LastExam | null = useMemo(() => {
    const latest = results.slice().sort((a, b) => new Date(b.submittedAt || b.createdAt).getTime() - new Date(a.submittedAt || a.createdAt).getTime())[0];
    if (latest) {
      const fromProfile = profileLast && profileLast.submittedAt && new Date(profileLast.submittedAt) >= new Date(latest.submittedAt || latest.createdAt) ? profileLast : null;
      return fromProfile || {
        examId: latest.examId, title: (byId[latest.examId] || {}).title || profileLast?.title || 'Exam',
        score: Number(latest.score), totalQuestions: Number(latest.totalQuestions),
        correct: Number(latest.correctAnswers || 0), wrong: Number(latest.wrongAnswers || 0), skipped: Number(latest.skippedAnswers || 0),
        submittedAt: latest.submittedAt || latest.createdAt,
      };
    }
    return profileLast;
  }, [results, profileLast, byId]);

  const g = greetingFor(new Date(now));
  const diff = nextExam ? Math.max(0, nextExam.at.getTime() - now) : 0;
  const dd = Math.floor(diff / 86400000), hh = Math.floor((diff % 86400000) / 3600000), mm = Math.floor((diff % 3600000) / 60000);
  const pct = last && last.totalQuestions ? Math.max(0, Math.min(100, Math.round(((last.correct || 0) / last.totalQuestions) * 100))) : null;
  const feeOk = paymentStatus.status === 'paid';

  return (
    <div className="flex flex-col gap-6 mc-stagger">
      {/* Greeting */}
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 grid place-items-center text-white text-xl font-extrabold bg-gradient-to-b from-amber-400 to-amber-600 shadow-[0_4px_0_0_#b45309]">
          {user?.profilePhotoUrl ? <img src={user.profilePhotoUrl} alt="" className="w-full h-full object-cover" /> : firstName(user?.fullName).charAt(0)}
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-bold tracking-[0.16em] uppercase text-amber-600 dark:text-amber-400">Mondal Coaching wishes you</div>
          <h2 className="text-2xl font-extrabold leading-tight truncate">{g.text}, {firstName(user?.fullName)} {g.emoji}</h2>
          <p className="text-sm text-zinc-500 bn">{g.line}</p>
        </div>
      </div>

      {/* Next exam */}
      <div className="mc-lift relative overflow-hidden rounded-3xl p-5 text-white shadow-[0_8px_0_0_#152571,0_18px_30px_-12px_rgba(26,47,143,.7)]"
        style={{ background: 'radial-gradient(90% 70% at 105% -10%,rgba(255,184,64,.55) 0%,transparent 55%),radial-gradient(80% 80% at -10% 110%,rgba(43,196,140,.45) 0%,transparent 55%),linear-gradient(155deg,#2F58F0,#1A2A86 70%,#231C6E)' }}>
        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-white/15"><CalendarClock className="w-3.5 h-3.5" /> Next Exam</span>
        {nextExam ? (
          <>
            <div className="mt-3 text-[13px] font-extrabold tracking-[0.14em] uppercase text-[#FFD27A]">{fmtDay(nextExam.at)}</div>
            <div className="text-3xl font-extrabold leading-tight">{fmtDate(nextExam.at)}</div>
            <div className="mt-1 inline-flex items-center gap-1.5 text-[13px] px-2.5 py-1 rounded-lg bg-black/20">Opens {fmtTime(nextExam.at)}</div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[[dd, 'Days', 'text-[#FFD27A]'], [hh, 'Hours', 'text-white'], [mm, 'Mins', 'text-[#8FF0C8]']].map(([v, l, c]) => (
                <div key={l as string} className="rounded-2xl py-2 bg-white/10 border border-white/15 backdrop-blur-sm shadow-[inset_0_-3px_0_rgba(0,0,0,.18)]">
                  <div className={`text-2xl font-extrabold tabular-nums leading-none ${c}`}>{pad(v as number)}</div>
                  <div className="text-[11px] opacity-85 mt-1">{l}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {nextExam.items.slice(0, 8).map((it: any) => (
                <span key={it.id} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-white/12 bn" style={{ background: 'rgba(255,255,255,.13)' }}><Lock className="w-3 h-3 text-amber-300" />{it.title}</span>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="mt-3 text-2xl font-extrabold">No exam scheduled yet</div>
            <p className="text-sm opacity-90 mt-1 bn">পরের ক্লাসের পরীক্ষার notification দাও — batch-এর যে কেউ দিতে পারে।</p>
            <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('mc-open-notifications'))}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm text-zinc-900 bg-gradient-to-b from-amber-300 to-amber-500 shadow-[0_4px_0_0_#92400e]">
              <BellPlus className="w-4 h-4" /> Add Notification for Exam
            </button>
          </>
        )}
      </div>

      {/* Progress tiles */}
      <div>
        <h3 className="text-lg font-extrabold mb-3">My Progress</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="mc-lift rounded-2xl p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-[0_10px_24px_-12px_rgba(19,28,51,.3)]">
            <div className={`w-8 h-8 rounded-xl grid place-items-center mb-2 ${absentCount ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'}`}><CheckCircle2 className="w-4 h-4" /></div>
            <div className="text-xl font-extrabold leading-tight">{absentCount ? `${absentCount}/3` : 'Great'}</div>
            <div className="text-xs text-zinc-500 leading-tight">{absentCount ? 'Missed (last 3)' : 'Attendance'}</div>
          </div>
          <Link to="/student/payments" className="mc-lift rounded-2xl p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-[0_10px_24px_-12px_rgba(19,28,51,.3)]">
            <div className={`w-8 h-8 rounded-xl grid place-items-center mb-2 ${feeOk ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'}`}><IndianRupee className="w-4 h-4" /></div>
            <div className="text-xl font-extrabold leading-tight">{feeOk ? 'Paid' : paymentStatus.status === 'rejected' ? 'Rejected' : 'Due'}</div>
            <div className="text-xs text-zinc-500 leading-tight truncate">{feeOk ? 'Fees' : (dueMonthsText || 'Pay now')}</div>
          </Link>
          <div className="mc-lift rounded-2xl p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-[0_10px_24px_-12px_rgba(19,28,51,.3)]">
            <div className="w-8 h-8 rounded-xl grid place-items-center mb-2 bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"><Trophy className="w-4 h-4" /></div>
            <div className="text-xl font-extrabold leading-tight tabular-nums">{results.length}</div>
            <div className="text-xs text-zinc-500 leading-tight">Exams Taken</div>
          </div>
        </div>
        {paymentStatus.status === 'rejected' && paymentStatus.remarks && (
          <p className="mt-2 text-xs font-semibold text-rose-600 bn">Payment rejected: {paymentStatus.remarks}</p>
        )}
      </div>

      {/* Last exam */}
      {last && (
        <div>
          <div className="flex justify-between items-baseline mb-3"><h3 className="text-lg font-extrabold">Last Exam</h3><Link to="/student/library?kind=exam" className="text-sm font-bold text-blue-600 dark:text-blue-400">Exams →</Link></div>
          <div className="mc-lift grid grid-cols-[auto_1fr] gap-4 items-center p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-[0_10px_24px_-12px_rgba(19,28,51,.3)]">
            <div className="w-[76px] h-[76px] rounded-full grid place-items-center" style={{ background: `conic-gradient(#17A673 ${(pct ?? 0)}%, rgba(125,135,163,.25) 0)` }}>
              <div className="w-[60px] h-[60px] rounded-full grid place-items-center bg-white dark:bg-zinc-900 font-extrabold tabular-nums">{pct !== null ? `${pct}%` : '—'}</div>
            </div>
            <div className="min-w-0">
              <div className="font-bold leading-snug bn">{last.title || 'Exam'}</div>
              <div className="text-xs text-zinc-500 mt-0.5">{fmtShort(last.submittedAt)} · Score {Number(last.score ?? 0)}{last.totalQuestions ? ` / ${last.totalQuestions}` : ''}</div>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[11.5px] font-bold">
                <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">✓ {last.correct ?? 0} Correct</span>
                <span className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">✗ {last.wrong ?? 0} Wrong</span>
                <span className="px-2 py-0.5 rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">– {last.skipped ?? 0} Skipped</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New study material */}
      <div>
        <div className="flex justify-between items-baseline mb-1"><h3 className="text-lg font-extrabold">New Study Material</h3><Link to="/student/library?kind=note" className="text-sm font-bold text-blue-600 dark:text-blue-400">See all →</Link></div>
        {fresh.length === 0 ? (
          <p className="text-sm text-zinc-500 bn py-3">এখনো কিছু দেওয়া হয়নি।</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-2 -mx-2 pt-4 pb-5">
            {fresh.map(({ item, at }) => {
              const isExam = item.type === 'exam';
              const to = isExam ? '/student/library?kind=exam' : `/student/library?kind=note&preview=${encodeURIComponent(item.id)}`;
              return (
                <Link key={item.id} to={to} className="mc-lift snap-start shrink-0 w-[72%] sm:w-[240px] p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-[0_10px_24px_-12px_rgba(19,28,51,.3)]">
                  <div className={`text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1 ${isExam ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'}`}>
                    {isExam ? <FileText className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}{isExam ? 'Exam' : 'Note'}
                  </div>
                  <div className="mt-1.5 font-bold leading-snug line-clamp-2 bn">{item.title}</div>
                  <div className="text-xs text-zinc-500 mt-1">{fmtShort(new Date(at).toISOString())}</div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <ExtraKnowledgeCard />
    </div>
  );
}

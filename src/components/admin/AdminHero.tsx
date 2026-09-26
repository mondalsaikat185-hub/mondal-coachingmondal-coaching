import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, IndianRupee, CalendarClock, Users, Camera } from 'lucide-react';
import { api } from '../../lib/api';
import { greetingFor, firstName } from '../student/greeting';
import { zoomPhoto } from '../PhotoZoom';

// Admin home header: greeting, today's to-do counts and the newest student photos.
export function AdminHero({ user }: { user: any }) {
  const [users, setUsers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [missing, setMissing] = useState<any[]>([]);
  const [now] = useState(() => Date.now());
  useEffect(() => {
    let alive = true;
    api.getUsers().then(u => { if (alive) setUsers(u || []); }).catch(() => {});
    api.getPayments().then(p => { if (alive) setPayments(p || []); }).catch(() => {});
    api.getBatches(user?.uid).then(b => { if (alive) setBatches(b || []); }).catch(() => {});
    api.getMissingExams().then(m => { if (alive) setMissing(m || []); }).catch(() => {});
    return () => { alive = false; };
  }, [user?.uid]);

  const students = useMemo(() => users.filter(u => String(u.role) !== 'admin'), [users]);
  const pendingStudents = students.filter(u => String(u.status || '').toLowerCase() === 'pending').length;
  const activeStudents = students.filter(u => String(u.status || '').toLowerCase() === 'active').length;
  const pendingPayments = payments.filter(p => String(p.status || '').toLowerCase() === 'pending').length;
  const nextExam = useMemo(() => {
    let best: { t: number; batch: string; n: number } | null = null;
    batches.forEach(b => {
      const s = b.scheduledStartTimeMap || {};
      const byT: Record<number, number> = {};
      Object.keys(s).forEach(id => { const t = new Date(s[id]).getTime(); if (!isNaN(t) && t > now) byT[t] = (byT[t] || 0) + 1; });
      Object.keys(byT).forEach(k => { const t = Number(k); if (!best || t < best.t) best = { t, batch: b.name, n: byT[t] }; });
    });
    return best as { t: number; batch: string; n: number } | null;
  }, [batches, now]);
  const photos = useMemo(() => students.filter(u => u.profilePhotoUrl)
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime())
    .slice(0, 16), [students]);

  const g = greetingFor(new Date(now));
  const today = new Date(now).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const tiles = [
    { to: '/admin/students', icon: UserPlus, label: 'New Joining Requests', value: pendingStudents, hot: pendingStudents > 0, c: 'from-amber-400 to-orange-600', sh: '#9a3412' },
    { to: '/admin/payments', icon: IndianRupee, label: 'Payments to Approve', value: pendingPayments, hot: pendingPayments > 0, c: 'from-emerald-400 to-emerald-700', sh: '#064e3b' },
    { to: '/admin/students', icon: Users, label: 'Active Students', value: activeStudents, hot: false, c: 'from-sky-400 to-blue-700', sh: '#1e3a8a' },
  ];

  return (
    <div className="flex flex-col gap-5 mb-8 mc-stagger">
      <div className="relative overflow-hidden rounded-3xl p-5 sm:p-6 text-white shadow-[0_8px_0_0_#1b1447,0_20px_34px_-14px_rgba(40,20,120,.7)]"
        style={{ background: 'radial-gradient(90% 80% at 105% -10%,rgba(255,184,64,.5) 0%,transparent 55%),radial-gradient(70% 80% at -10% 110%,rgba(180,91,255,.5) 0%,transparent 55%),linear-gradient(150deg,#3B2FD9,#1C1A6E 65%,#120F3A)' }}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 grid place-items-center text-2xl font-extrabold bg-gradient-to-b from-amber-300 to-amber-500 text-zinc-900 shadow-[0_5px_0_0_#92400e]">
            {user?.profilePhotoUrl ? <img src={user.profilePhotoUrl} alt="" className="w-full h-full object-cover" /> : '★'}
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold tracking-[0.16em] uppercase text-[#FFD27A]">Admin · Mondal Coaching</div>
            <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight">{g.text}, {firstName(user?.fullName || user?.displayName || 'Admin')} {g.emoji}</h2>
            <div className="text-sm opacity-85">{today}</div>
          </div>
        </div>
        <div className="mt-4 inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-xl bg-black/20">
          <CalendarClock className="w-4 h-4 text-[#8FF0C8]" />
          {nextExam
            ? <span>Next exam: <b>{new Date(nextExam.t).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</b> · {nextExam.batch} · {nextExam.n} exam{nextExam.n > 1 ? 's' : ''}</span>
            : <span>No upcoming exam scheduled</span>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {tiles.map(t => (
          <Link key={t.label} to={t.to} className={`mc-lift relative rounded-3xl p-3 sm:p-4 text-white bg-gradient-to-b ${t.c}`} style={{ boxShadow: `0 6px 0 0 ${t.sh}` }}>
            {t.hot && <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-white animate-ping" />}
            <t.icon className="w-5 h-5 opacity-90" />
            <div className="mt-2 text-3xl font-extrabold tabular-nums leading-none">{t.value}</div>
            <div className="mt-1 text-[11px] sm:text-xs font-semibold leading-tight opacity-95">{t.label}</div>
          </Link>
        ))}
      </div>

      {missing.length > 0 && (
        <Link to="/admin/library" className="mc-lift block rounded-3xl p-4 border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800">
          <div className="font-extrabold text-amber-900 dark:text-amber-200">⚠️ Notes shared, but exam not created yet ({missing.length})</div>
          <ul className="mt-2 text-sm text-amber-900 dark:text-amber-200 space-y-1">
            {missing.slice(0, 8).map((m: any) => <li key={m.batchId + m.id}><b>{m.batchName}</b> · {m.title}</li>)}
          </ul>
          <div className="text-xs mt-2 text-amber-800/80 dark:text-amber-300/80">এগুলোর exam library-তে তুললে ছাত্রদের Exam Notification-এ নিজে থেকে চলে আসবে।</div>
        </Link>
      )}

      {photos.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-1"><Camera className="w-4 h-4 text-zinc-500" /><h3 className="text-lg font-extrabold">Student Photos</h3><span className="text-xs text-zinc-500">tap to enlarge</span></div>
          <div className="flex gap-3 overflow-x-auto px-2 -mx-2 pt-3 pb-4">
            {photos.map(u => (
              <button type="button" key={u.id} onClick={() => zoomPhoto(u.profilePhotoUrl, u.name)} className="shrink-0 w-[72px] text-center">
                <img src={u.profilePhotoUrl} alt={u.name} className="w-[72px] h-[72px] rounded-2xl object-cover bg-zinc-200" />
                <div className="mt-1 text-[11px] font-semibold truncate">{firstName(u.name)}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

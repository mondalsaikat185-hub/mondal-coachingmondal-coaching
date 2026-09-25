import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, BookOpen, FileText, IndianRupee, User } from 'lucide-react';

// Mobile-first bottom navigation for students (thumb reach). Active tab rises in 3D with a light ring.
export function StudentBottomNav() {
  const loc = useLocation();
  const params = new URLSearchParams(loc.search);
  const kind = params.get('kind');
  const path = loc.pathname.replace(/\/+$/, '');
  useEffect(() => {
    document.body.classList.add('mc-has-bottomnav');
    return () => document.body.classList.remove('mc-has-bottomnav');
  }, []);
  const tabs = [
    { to: '/student', label: 'Home', icon: Home, on: path === '/student' || path === '' },
    { to: '/student/library?kind=note', label: 'Library', icon: BookOpen, on: path === '/student/library' && kind !== 'exam' },
    { to: '/student/library?kind=exam', label: 'Exams', icon: FileText, on: path === '/student/library' && kind === 'exam' },
    { to: '/student/payments', label: 'Fees', icon: IndianRupee, on: path === '/student/payments' },
  ];
  return (
    <nav className="mc-bottomnav mc-nofx" aria-label="Main">
      {tabs.map(t => (
        <Link key={t.label} to={t.to} className={t.on ? 'mc-on' : ''} aria-current={t.on ? 'page' : undefined}>
          <span className="mc-ni"><t.icon className="w-5 h-5" /></span>{t.label}
        </Link>
      ))}
      <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('mc-open-profile'))}>
        <span className="mc-ni"><User className="w-5 h-5" /></span>Profile
      </button>
    </nav>
  );
}

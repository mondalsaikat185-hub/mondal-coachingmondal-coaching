import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Users, BookOpen, IndianRupee, BarChart3 } from 'lucide-react';

// Admin bottom bar (same look as the students'): Home is always one tap away.
export function AdminBottomNav() {
  const loc = useLocation();
  const path = loc.pathname.replace(/\/+$/, '');
  useEffect(() => {
    document.body.classList.add('mc-has-bottomnav');
    return () => document.body.classList.remove('mc-has-bottomnav');
  }, []);
  const tabs = [
    { to: '/admin', label: 'Home', icon: Home, on: path === '/admin' },
    { to: '/admin/students', label: 'Students', icon: Users, on: path.startsWith('/admin/students') || path.startsWith('/admin/batches') },
    { to: '/admin/library', label: 'Library', icon: BookOpen, on: path.startsWith('/admin/library') },
    { to: '/admin/payments', label: 'Payments', icon: IndianRupee, on: path.startsWith('/admin/payments') },
    { to: '/admin/results', label: 'Results', icon: BarChart3, on: path.startsWith('/admin/results') },
  ];
  return (
    <nav className="mc-bottomnav mc-nofx" aria-label="Admin">
      {tabs.map(t => (
        <Link key={t.label} to={t.to} className={t.on ? 'mc-on' : ''} aria-current={t.on ? 'page' : undefined}>
          <span className="mc-ni"><t.icon className="w-5 h-5" /></span>{t.label}
        </Link>
      ))}
    </nav>
  );
}

import React, { useEffect, useState } from 'react';
import { greetingFor, firstName } from './greeting';

// Shown once each time the app is opened (per browser session), right after login:
// the logo flies in in 3D with sparkles, then "Mondal Coaching wishes Good Morning, <name>".
const KEY = 'mc_splash_shown';

export function WelcomeSplash({ name, admin = false }: { name?: string | null; admin?: boolean }) {
  const [show, setShow] = useState(() => {
    try { return !sessionStorage.getItem(KEY); } catch (e) { return false; }
  });
  const [leaving, setLeaving] = useState(false);
  const g = greetingFor();

  useEffect(() => {
    if (!show) return;
    try { sessionStorage.setItem(KEY, '1'); } catch (e) { /* ignore */ }
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t1 = window.setTimeout(() => setLeaving(true), reduce ? 900 : 2900);
    const t2 = window.setTimeout(() => setShow(false), reduce ? 1100 : 3500);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [show]);

  if (!show) return null;
  const skip = () => { setLeaving(true); window.setTimeout(() => setShow(false), 450); };
  const sparks = Array.from({ length: 14 }, (_, i) => i);

  return (
    <div className={`mc-splash mc-nofx ${leaving ? 'mc-splash-out' : ''}`} onClick={skip} role="dialog" aria-label="Welcome">
      <style>{`
        .mc-splash{position:fixed;inset:0;z-index:100000;display:grid;place-items:center;text-align:center;color:#fff;cursor:pointer;
          background:radial-gradient(80% 60% at 80% 10%,rgba(255,184,64,.35),transparent 60%),radial-gradient(70% 60% at 10% 100%,rgba(43,196,140,.35),transparent 60%),linear-gradient(160deg,#2F58F0,#16206E 65%,#0B1020);
          transition:opacity .55s ease, transform .55s ease;perspective:900px}
        .mc-splash-out{opacity:0;transform:scale(1.06)}
        .mc-splash .logo{width:112px;height:112px;border-radius:30px;margin:0 auto;background:#fff url(/pwa-192x192.png) center/cover;
          box-shadow:0 10px 0 rgba(0,0,0,.25),0 0 40px 6px rgba(255,200,90,.55);animation:mcLogo 1.4s cubic-bezier(.2,1.3,.3,1) both}
        @keyframes mcLogo{0%{transform:rotateY(-110deg) rotateX(25deg) scale(.3);opacity:0}60%{transform:rotateY(12deg) scale(1.12);opacity:1}100%{transform:none}}
        .mc-splash .brand{margin-top:18px;font:800 30px "Plus Jakarta Sans",sans-serif;letter-spacing:-.02em;animation:mcUp .8s .5s cubic-bezier(.16,1,.3,1) both}
        .mc-splash .wish{margin-top:6px;font:600 13px "Plus Jakarta Sans",sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#FFD27A;animation:mcUp .8s .8s cubic-bezier(.16,1,.3,1) both}
        .mc-splash .hi{margin-top:10px;font:800 26px "Plus Jakarta Sans","Hind Siliguri",sans-serif;animation:mcUp .8s 1.05s cubic-bezier(.16,1,.3,1) both}
        .mc-splash .line{margin-top:6px;font:500 15px "Hind Siliguri",sans-serif;opacity:.9;animation:mcUp .8s 1.3s cubic-bezier(.16,1,.3,1) both}
        .mc-splash .skip{position:absolute;bottom:calc(24px + env(safe-area-inset-bottom,0px));left:0;right:0;font:600 12px "Plus Jakarta Sans",sans-serif;opacity:.6}
        @keyframes mcUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
        .mc-splash .sp{position:absolute;left:50%;top:42%;width:6px;height:6px;border-radius:50%;background:#FFE7A8;box-shadow:0 0 10px 2px #FFD27A;opacity:0;animation:mcSpark 1.6s ease-out both}
        @keyframes mcSpark{0%{opacity:0;transform:translate(0,0) scale(.4)}20%{opacity:1}100%{opacity:0;transform:translate(var(--x),var(--y)) scale(1.2)}}
      `}</style>
      <div>
        {sparks.map(i => {
          const a = (i / sparks.length) * Math.PI * 2;
          const r = 110 + (i % 3) * 40;
          return <span key={i} className="sp" style={{ ['--x' as any]: `${Math.cos(a) * r}px`, ['--y' as any]: `${Math.sin(a) * r}px`, animationDelay: `${0.7 + (i % 5) * 0.08}s` } as React.CSSProperties} />;
        })}
        <div className="logo" aria-hidden="true" />
        <div className="brand">Mondal Coaching</div>
        <div className="wish">{admin ? 'welcomes back the Admin' : 'wishes you'}</div>
        <div className="hi">{g.text}, {firstName(name)} {g.emoji}</div>
        <div className="line">{admin ? 'আজকের ক্লাস, পরীক্ষা আর ফি — সব এক নজরে।' : g.line}</div>
      </div>
      <div className="skip">Tap to continue</div>
    </div>
  );
}

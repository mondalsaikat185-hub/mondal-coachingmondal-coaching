import React, { useEffect, useState } from 'react';

// Tap a student's photo anywhere (admin lists) to see it large: window.dispatchEvent(new CustomEvent('mc-zoom-photo', { detail: { src, name } }))
export function PhotoZoom() {
  const [p, setP] = useState<{ src: string; name?: string } | null>(null);
  useEffect(() => {
    const on = (e: Event) => { const d = (e as CustomEvent).detail; if (d && d.src) setP(d); };
    window.addEventListener('mc-zoom-photo', on);
    return () => window.removeEventListener('mc-zoom-photo', on);
  }, []);
  if (!p) return null;
  return (
    <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/75 p-6 mc-nofx" onClick={() => setP(null)}>
      <div className="text-center">
        <img src={p.src} alt={p.name || 'Photo'} className="w-72 h-72 max-w-full rounded-3xl object-cover shadow-2xl bg-white" />
        {p.name && <div className="mt-3 text-white font-bold">{p.name}</div>}
        <div className="mt-1 text-white/60 text-xs">Tap to close</div>
      </div>
    </div>
  );
}
export const zoomPhoto = (src: string, name?: string) => window.dispatchEvent(new CustomEvent('mc-zoom-photo', { detail: { src, name } }));

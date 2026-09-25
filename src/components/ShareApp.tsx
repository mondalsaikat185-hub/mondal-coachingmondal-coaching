import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Share2, X, Copy, Check } from 'lucide-react';

// "Share App": a QR code any phone camera / Google Lens can scan to open the app directly,
// plus copy-link and WhatsApp share. Uses the address the app is running on.
export const APP_URL = 'https://mondal-coachingmondal-coaching.vercel.app';

function appUrl(): string {
  try {
    const o = window.location.origin;
    // on preview builds share the real (production) address
    return /vercel\.app$/.test(o) && o !== APP_URL ? APP_URL : o;
  } catch (e) { return APP_URL; }
}

export function ShareAppButton({ className = '', label = false }: { className?: string; label?: boolean }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = appUrl();
  const text = `Mondal Coaching app — এই লিংকে খুলুন / Open: ${url}`;

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
    catch (e) { window.prompt('Copy this link', url); }
  };
  const nativeShare = async () => {
    try { if ((navigator as any).share) await (navigator as any).share({ title: 'Mondal Coaching', text, url }); } catch (e) { /* cancelled */ }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Share App" title="Share App"
        className={className || 'p-2 border-2 border-zinc-900 dark:border-zinc-100 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1'}>
        <Share2 className="w-4 h-4" />{label && <span className="text-xs font-bold">Share App</span>}
      </button>
      {open && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-zinc-900 p-6 text-center relative shadow-2xl" onClick={e => e.stopPropagation()}>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="absolute top-3 right-3 p-2 rounded-full bg-zinc-100 dark:bg-zinc-800"><X className="w-4 h-4" /></button>
            <h3 className="text-xl font-extrabold">Share App</h3>
            <p className="text-sm text-zinc-500 mt-1 bn">নতুন ছাত্রের ফোনের ক্যামেরা বা Google Lens দিয়ে এই QR স্ক্যান করলেই app খুলে যাবে।</p>
            <div className="mt-5 mx-auto w-fit p-4 rounded-3xl bg-white shadow-[0_10px_30px_-12px_rgba(19,28,51,.4)] ring-4 ring-amber-300/60">
              <QRCodeSVG value={url} size={210} level="M" includeMargin={false} fgColor="#131C33" bgColor="#FFFFFF" />
            </div>
            <div className="mt-4 text-xs font-semibold text-zinc-500 break-all select-all">{url}</div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" onClick={copy} className="flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm bg-zinc-100 dark:bg-zinc-800">
                {copied ? <><Check className="w-4 h-4 text-emerald-600" /> Copied</> : <><Copy className="w-4 h-4" /> Copy Link</>}
              </button>
              <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm text-white bg-gradient-to-b from-emerald-500 to-emerald-700 shadow-[0_4px_0_0_#064e3b]">
                WhatsApp
              </a>
            </div>
            {(navigator as any).share && (
              <button type="button" onClick={nativeShare} className="mt-3 w-full py-3 rounded-2xl font-bold text-sm text-white bg-gradient-to-b from-blue-500 to-blue-700 shadow-[0_4px_0_0_#1e3a8a]">
                More options…
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

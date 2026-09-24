// Minimal dependency-free toast. Usage: showToast('মুছে ফেলা হয়েছে ✓') / showToast('ব্যর্থ হয়েছে', 'error')
export type ToastKind = 'success' | 'error' | 'info';

export function showToast(message: string, kind: ToastKind = 'success', ms = 2800): void {
  if (typeof document === 'undefined') return;
  let host = document.getElementById('mc-toast-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'mc-toast-host';
    host.style.cssText =
      'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483647;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none;max-width:92vw';
    document.body.appendChild(host);
  }
  const el = document.createElement('div');
  const bg = kind === 'error' ? '#dc2626' : kind === 'info' ? '#1f2937' : '#16a34a';
  el.textContent = message;
  el.style.cssText =
    `background:${bg};color:#fff;font-weight:800;font-size:14px;padding:10px 16px;border:3px solid #000;box-shadow:4px 4px 0 #000;opacity:0;transition:opacity .2s;pointer-events:auto;text-align:center`;
  host.appendChild(el);
  requestAnimationFrame(() => { el.style.opacity = '1'; });
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 250);
  }, ms);
}

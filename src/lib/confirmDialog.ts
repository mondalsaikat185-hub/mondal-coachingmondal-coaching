// In-app confirm dialog (replaces window.confirm, which phones / installed apps often block silently).
// Usage: if (!(await confirmAsync('মুছবেন?'))) return;
export function confirmAsync(message: string, okLabel = 'হ্যাঁ', cancelLabel = 'না'): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') { resolve(false); return; }
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483646;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:16px';
    const box = document.createElement('div');
    box.style.cssText = 'background:#fff;color:#111;border:4px solid #000;box-shadow:8px 8px 0 #000;max-width:420px;width:100%;padding:20px;font-family:inherit';
    const p = document.createElement('p');
    p.textContent = message;
    p.style.cssText = 'font-weight:800;font-size:15px;line-height:1.5;margin:0 0 18px;white-space:pre-wrap';
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:10px;justify-content:flex-end';
    const mk = (label: string, bg: string, fg: string) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.style.cssText = `background:${bg};color:${fg};border:3px solid #000;font-weight:900;padding:10px 18px;font-size:14px;cursor:pointer;min-width:84px`;
      return b;
    };
    const cancel = mk(cancelLabel, '#fff', '#111');
    const ok = mk(okLabel, '#dc2626', '#fff');
    const close = (v: boolean) => { overlay.remove(); resolve(v); };
    cancel.onclick = () => close(false);
    ok.onclick = () => close(true);
    overlay.onclick = (e) => { if (e.target === overlay) close(false); };
    row.append(cancel, ok);
    box.append(p, row);
    overlay.append(box);
    document.body.appendChild(overlay);
    ok.focus();
  });
}

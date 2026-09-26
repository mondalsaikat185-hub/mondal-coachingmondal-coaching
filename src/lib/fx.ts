// Global touch/hover effects for every screen: the item under the finger/mouse lifts toward
// the viewer with a thin light ring on its border, and a soft light ripple spreads from the touch.
// Performance: only newly added parts of the page are scanned, each element is checked once,
// rings animate only while on screen, and weak phones get still (non-animated) rings.
const CANDIDATE = 'button, a[href], [role="button"], .mc-lift, ' +
  '[class*="shadow-[2px_2px_0px"], [class*="shadow-[3px_3px_0px"], [class*="shadow-[4px_4px_0px"], [class*="shadow-[6px_6px_0px"], [class*="shadow-[8px_8px_0px"]';
const INTERACTIVE = CANDIDATE + ', label';

const seen = new WeakSet<Element>();

// rings animate only while the item is on screen
const io: IntersectionObserver | null = typeof IntersectionObserver !== 'undefined'
  ? new IntersectionObserver(entries => entries.forEach(en => (en.target as HTMLElement).classList.toggle('mc-vis', en.isIntersecting)), { rootMargin: '60px' })
  : null;

function mark(el: HTMLElement): boolean {
  if (seen.has(el)) return el.classList.contains('mc-fx');
  seen.add(el);
  if (el.closest('.mc-nofx, .mc-bottomnav')) return false;
  const r = el.getBoundingClientRect();
  // big page panels do not get effects (only cards, tiles, buttons, options)
  if (r.width * r.height > window.innerWidth * window.innerHeight * 0.45 || r.height > window.innerHeight * 0.7) return false;
  if (r.width && r.width < 64 && r.height < 64) el.classList.add('mc-small');
  el.classList.add('mc-fx');
  if (io) io.observe(el);
  return true;
}

function pick(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  if (target.closest('.mc-nofx, input, textarea, select, .mc-bottomnav')) return null;
  const el = target.closest(INTERACTIVE) as HTMLElement | null;
  if (!el || (el as HTMLButtonElement).disabled) return null;
  if (el.tagName === 'LABEL' && !el.querySelector('input[type="checkbox"], input[type="radio"]')) return null;
  seen.delete(el); // size may have changed since first seen
  return mark(el) ? el : null;
}

let hot: HTMLElement | null = null;
function setHot(el: HTMLElement | null) {
  if (hot === el) return;
  if (hot) hot.classList.remove('mc-hot');
  hot = el;
  if (hot) hot.classList.add('mc-hot');
}

function ripple(el: HTMLElement, x: number, y: number) {
  const r = el.getBoundingClientRect();
  const d = document.createElement('span');
  d.className = 'mc-ripple';
  d.style.left = (x - r.left) + 'px';
  d.style.top = (y - r.top) + 'px';
  el.appendChild(d);
  window.setTimeout(() => d.remove(), 700);
}

function isWeakDevice(): boolean {
  const n: any = navigator;
  return (n.hardwareConcurrency && n.hardwareConcurrency <= 4) || (n.deviceMemory && n.deviceMemory <= 3) || (n.connection && n.connection.saveData);
}

export function installFx() {
  if (typeof window === 'undefined' || (window as any).__mcFx) return;
  (window as any).__mcFx = true;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (isWeakDevice()) document.documentElement.classList.add('mc-lite');

  // mark tappable items as they appear, so phones see the resting colour ring
  let pending: Element[] = [];
  let queued = false;
  const idle = (cb: () => void) => ((window as any).requestIdleCallback ? (window as any).requestIdleCallback(cb, { timeout: 400 }) : window.setTimeout(cb, 120));
  const flush = () => {
    queued = false;
    const roots = pending; pending = [];
    for (const root of roots) {
      if (!root.isConnected) continue;
      if (root.matches && root.matches(CANDIDATE)) mark(root as HTMLElement);
      root.querySelectorAll(CANDIDATE).forEach(n => { if (!seen.has(n)) mark(n as HTMLElement); });
    }
  };
  const add = (n: Node) => {
    if (n.nodeType !== 1) return;
    const el = n as Element;
    if (el.classList.contains('mc-ripple')) return;
    pending.push(el);
    if (!queued) { queued = true; idle(flush); }
  };
  new MutationObserver(list => { for (const m of list) m.addedNodes.forEach(add); }).observe(document.body, { childList: true, subtree: true });
  add(document.body);

  const fine = window.matchMedia && window.matchMedia('(hover: hover)').matches;
  if (fine) {
    document.addEventListener('mouseover', (e) => setHot(pick(e.target)), { passive: true });
    document.addEventListener('mouseleave', () => setHot(null), { passive: true });
  }
  document.addEventListener('pointerdown', (e) => {
    const el = pick(e.target);
    if (!el) return;
    setHot(el);
    ripple(el, e.clientX, e.clientY);
  }, { passive: true });
  const release = () => { if (!fine) window.setTimeout(() => setHot(null), 220); };
  document.addEventListener('pointerup', release, { passive: true });
  document.addEventListener('pointercancel', release, { passive: true });
  document.addEventListener('scroll', () => { if (!fine) setHot(null); }, { passive: true, capture: true });
}

// Global touch/hover effects for every screen: the item under the finger/mouse lifts toward
// the viewer with a thin light ring on its border, and a soft light ripple spreads from the touch.
const CANDIDATE = 'button, a[href], [role="button"], .mc-lift, label:has(input[type="checkbox"]), label:has(input[type="radio"]), ' +
  '[class*="shadow-[2px_2px_0px"], [class*="shadow-[3px_3px_0px"], [class*="shadow-[4px_4px_0px"], [class*="shadow-[6px_6px_0px"], [class*="shadow-[8px_8px_0px"]';

function pick(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  if (target.closest('.mc-nofx, input, textarea, select, .mc-bottomnav')) return null;
  const el = target.closest(CANDIDATE) as HTMLElement | null;
  if (!el || (el as HTMLButtonElement).disabled) return null;
  const r = el.getBoundingClientRect();
  // big page panels do not lift (only cards, tiles, buttons, options)
  if (r.width * r.height > window.innerWidth * window.innerHeight * 0.45 || r.height > window.innerHeight * 0.7) return null;
  if (!el.classList.contains('mc-fx')) {
    if (io) io.observe(el);
    const cs = getComputedStyle(el);
    if (cs.position === 'static') el.classList.add('mc-rel');
    if (r.width < 64 && r.height < 64) el.classList.add('mc-small');
    el.classList.add('mc-fx');
  }
  return el;
}

// rings animate only while the item is on screen
const io: IntersectionObserver | null = typeof IntersectionObserver !== 'undefined'
  ? new IntersectionObserver(entries => entries.forEach(en => (en.target as HTMLElement).classList.toggle('mc-vis', en.isIntersecting)), { rootMargin: '60px' })
  : null;

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

export function installFx() {
  if (typeof window === 'undefined' || (window as any).__mcFx) return;
  (window as any).__mcFx = true;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  // mark every tappable item up front so it shows its resting colour ring (important on phones)
  let queued = false;
  const scan = () => {
    queued = false;
    document.querySelectorAll(CANDIDATE).forEach(n => { if (!(n as HTMLElement).classList.contains('mc-fx')) pick(n); });
  };
  const queue = () => { if (!queued) { queued = true; window.setTimeout(scan, 250); } };
  new MutationObserver(queue).observe(document.body, { childList: true, subtree: true });
  queue();
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

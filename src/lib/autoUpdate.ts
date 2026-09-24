// Auto-update: detects a newly deployed version and reloads the app by itself,
// WITHOUT logging the user out and WITHOUT interrupting an exam in progress.
import { showToast } from './toast';

declare const __MC_BUILD_ID__: string;
const CURRENT_BUILD: string = typeof __MC_BUILD_ID__ !== 'undefined' ? __MC_BUILD_ID__ : 'dev';

let examActive = false;
let pendingReload = false;
let started = false;

/** Called by the quiz player: while an exam is open we never auto-reload. */
export function setExamActive(active: boolean): void {
  examActive = active;
  if (!active && pendingReload) doReload();
}

function doReload(): void {
  if (examActive) { pendingReload = true; return; }
  showToast('নতুন আপডেট পাওয়া গেছে — অ্যাপ রিফ্রেশ হচ্ছে…', 'info', 2000);
  setTimeout(() => {
    const url = window.location.pathname + '?v=' + Date.now() + window.location.hash;
    window.location.replace(url);
  }, 1500);
}

async function checkForUpdate(): Promise<void> {
  if (CURRENT_BUILD === 'dev') return;
  try {
    const res = await fetch('/version.json?t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    if (data && data.build && String(data.build) !== CURRENT_BUILD) {
      doReload();
    }
  } catch (_) {
    // offline or blocked — try again later
  }
}

export function startAutoUpdate(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  // Check shortly after start, whenever the app comes back to the foreground, and every 5 minutes.
  setTimeout(checkForUpdate, 5000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdate();
  });
  window.addEventListener('focus', () => checkForUpdate());
  setInterval(checkForUpdate, 5 * 60 * 1000);
}

/** Keys that must survive a cache reset (login, theme, unsent exam results, running exam state). */
function isProtectedKey(k: string): boolean {
  return (
    k === 'mc_session_token' ||
    k === 'mc_session_user' ||
    k === 'tuition-theme' ||
    k === 'app_version' ||
    k.startsWith('mc_exam_outbox_') ||
    k.startsWith('mc_submitted_exams_') ||
    k.startsWith('quiz_')
  );
}

/** Full refresh: removes old offline caches + cached data, keeps the user logged in, reloads fresh code. */
export async function fullResetKeepLogin(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
  } catch (_) {}
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } catch (_) {}
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && !isProtectedKey(k)) toRemove.push(k);
    }
    toRemove.forEach(k => localStorage.removeItem(k));
    sessionStorage.clear();
  } catch (_) {}
  window.location.replace(window.location.pathname + '?update=' + Date.now() + window.location.hash);
}

import React, { ComponentType, lazy } from 'react';

export const CHUNK_RELOAD_KEY = 'mc_chunk_reload';

/** Clear the guard key after successful app start */
export function clearChunkReloadGuard(): void {
  try {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  } catch (_) {}
}

/** Preload error listener for Vite dynamic imports */
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (e: Event) => {
    e.preventDefault();
    let alreadyReloaded = false;
    try {
      alreadyReloaded = !!sessionStorage.getItem(CHUNK_RELOAD_KEY);
    } catch (_) {}

    if (!alreadyReloaded) {
      try {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, 'true');
      } catch (_) {}
      window.location.reload();
    } else {
      try {
        sessionStorage.removeItem(CHUNK_RELOAD_KEY);
      } catch (_) {}
    }
  });
}

function ChunkLoadFallback() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 border-4 border-yellow-500 dark:border-yellow-400 p-6 rounded-2xl shadow-[6px_6px_0px_0px_rgba(234,179,8,0.3)] text-center space-y-4">
        <div className="text-3xl">🔄</div>
        <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100">
          নতুন আপডেট এসেছে, পেজটি রিফ্রেশ করুন
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-bold leading-relaxed">
          অ্যাপটির একটি নতুন সংস্করণ উপলব্ধ রয়েছে। সর্বশেষ ফিচার পেতে পেজটি পুনরায় লোড করুন।
        </p>
        <button
          onClick={() => {
            clearChunkReloadGuard();
            window.location.reload();
          }}
          className="w-full py-3 bg-yellow-400 hover:bg-yellow-500 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all border-2 border-zinc-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
        >
          এখনই রিফ্রেশ করুন (Refresh Page)
        </button>
      </div>
    </div>
  );
}

/**
 * Wraps dynamic import with a reload-once safety guard for chunk 404s after new deploys.
 */
export function lazyWithReload<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err: any) {
      console.warn('[lazyWithReload] Dynamic import failed:', err);

      let alreadyReloaded = false;
      try {
        alreadyReloaded = !!sessionStorage.getItem(CHUNK_RELOAD_KEY);
      } catch (_) {}

      if (!alreadyReloaded) {
        try {
          sessionStorage.setItem(CHUNK_RELOAD_KEY, 'true');
        } catch (_) {}
        window.location.reload();
        // Return a never-resolving promise so React waits for page reload without crashing
        return new Promise<{ default: T }>(() => {});
      }

      // If already reloaded once and still failing, clear guard and show recovery UI
      try {
        sessionStorage.removeItem(CHUNK_RELOAD_KEY);
      } catch (_) {}

      return { default: ChunkLoadFallback as unknown as T };
    }
  });
}

// src/lib/useBackStep.ts
// Lightweight popstate interceptor (for active quiz confirmation, etc.)
// Pure URL search params are the single source of truth for folders, previews, and modals.

import { useEffect, useRef } from 'react';

export type BackStepHandler = () => boolean | void;

interface Interceptor {
  name: string;
  handler: BackStepHandler;
}

const activeInterceptors: Interceptor[] = [];

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    if (activeInterceptors.length > 0) {
      const top = activeInterceptors[activeInterceptors.length - 1];
      try {
        const res = top.handler();
        if (res === false) {
          // Intercepted / cancelled (e.g. running quiz confirm dialog)
          // Re-push history entry so the browser stays on the current screen
          window.history.pushState(null, '', window.location.href);
        }
      } catch (err) {
        console.error('[useBackStep] popstate handler error:', err);
      }
    }
  });
}

/**
 * Triggers a back step via history.back().
 */
export function triggerBack() {
  if (typeof window !== 'undefined') {
    window.history.back();
  }
}

/**
 * useBackStep hook:
 * When active is true, registers an interceptor on popstate.
 * If handler returns false, the popstate navigation is prevented (re-pushed).
 */
export function useBackStep(
  name: string,
  active: boolean,
  onBack: BackStepHandler
) {
  const handlerRef = useRef(onBack);
  handlerRef.current = onBack;

  useEffect(() => {
    if (!active) return;

    const record: Interceptor = {
      name,
      handler: () => handlerRef.current(),
    };
    activeInterceptors.push(record);

    return () => {
      const idx = activeInterceptors.lastIndexOf(record);
      if (idx !== -1) {
        activeInterceptors.splice(idx, 1);
      }
    };
  }, [active, name]);
}

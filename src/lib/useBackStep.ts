// src/lib/useBackStep.ts
// Shared back step management for mobile / Android back button.
// Pushes history state on every step (folder navigation, preview, modal, tab, quiz)
// and handles popstate so Back button always goes back exactly one step.

import { useEffect, useRef, useCallback } from 'react';

export type BackStepHandler = () => boolean | void;

interface StepRecord {
  id: string;
  name: string;
  handler: BackStepHandler;
}

const backStepStack: StepRecord[] = [];
let isSilentPop = false;

// Global popstate listener registered once
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', (e) => {
    if (isSilentPop) {
      isSilentPop = false;
      return;
    }

    if (backStepStack.length > 0) {
      const top = backStepStack.pop()!;
      try {
        const result = top.handler();
        // If handler explicitly returned false, the action was cancelled/intercepted (e.g. running exam confirm)
        if (result === false) {
          // Re-push history state so stack and browser stay matched
          window.history.pushState({ mcStep: top.name, id: top.id }, '');
          backStepStack.push(top);
        }
      } catch (err) {
        console.error('[useBackStep] handler error:', err);
      }
    }
  });
}

/**
 * Triggers a back step via history.back(), popping the topmost step cleanly.
 */
export function triggerBack() {
  if (typeof window !== 'undefined') {
    window.history.back();
  }
}

/**
 * useBackStep hook:
 * When active is true, pushes a history state { mcStep: name }.
 * When user hits Back (popstate), runs onBack.
 * If closed from within code/UI without popstate, silently unwinds history entry.
 */
export function useBackStep(
  name: string,
  active: boolean,
  onBack: BackStepHandler
) {
  const handlerRef = useRef(onBack);
  handlerRef.current = onBack;
  const stepIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!active) {
      if (stepIdRef.current) {
        const id = stepIdRef.current;
        stepIdRef.current = null;
        const idx = backStepStack.findIndex(s => s.id === id);
        if (idx !== -1) {
          backStepStack.splice(idx, 1);
          isSilentPop = true;
          window.history.back();
        }
      }
      return;
    }

    const stepId = 'step_' + Math.random().toString(36).substring(2, 9);
    stepIdRef.current = stepId;

    const record: StepRecord = {
      id: stepId,
      name,
      handler: () => handlerRef.current(),
    };

    window.history.pushState({ mcStep: name, id: stepId }, '');
    backStepStack.push(record);

    return () => {
      if (stepIdRef.current) {
        const id = stepIdRef.current;
        stepIdRef.current = null;
        const idx = backStepStack.findIndex(s => s.id === id);
        if (idx !== -1) {
          backStepStack.splice(idx, 1);
          isSilentPop = true;
          window.history.back();
        }
      }
    };
  }, [active, name]);

  const closeWithBack = useCallback(() => {
    if (stepIdRef.current) {
      window.history.back();
    } else {
      handlerRef.current();
    }
  }, []);

  return { triggerBack: closeWithBack };
}

/**
 * useFolderBackStep:
 * Specifically for folder tree navigation (Folder -> Sub-folder -> Root).
 * Pushes a step each time a non-null folder is entered.
 * Pops back to parent folder on Back.
 */
export function useFolderBackStep(
  currentFolderId: string | null,
  onBackToParent: () => void
) {
  const onBackRef = useRef(onBackToParent);
  onBackRef.current = onBackToParent;
  const activeFolderRef = useRef<string | null>(null);
  const stepIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!currentFolderId) {
      // At root: remove any active folder step if present
      if (stepIdRef.current) {
        const id = stepIdRef.current;
        stepIdRef.current = null;
        activeFolderRef.current = null;
        const idx = backStepStack.findIndex(s => s.id === id);
        if (idx !== -1) {
          backStepStack.splice(idx, 1);
          isSilentPop = true;
          window.history.back();
        }
      }
      return;
    }

    // Entering a folder or changing to another folder
    const prevFolderId = activeFolderRef.current;
    activeFolderRef.current = currentFolderId;

    // Push new history state for this folder level
    const stepId = 'fldr_' + currentFolderId + '_' + Math.random().toString(36).substring(2, 6);
    stepIdRef.current = stepId;

    const record: StepRecord = {
      id: stepId,
      name: 'folder_' + currentFolderId,
      handler: () => {
        stepIdRef.current = null;
        activeFolderRef.current = null;
        onBackRef.current();
      },
    };

    window.history.pushState({ mcStep: 'folder', id: stepId, folderId: currentFolderId }, '');
    backStepStack.push(record);

    return () => {
      // If unmounting folder step
      if (stepIdRef.current) {
        const id = stepIdRef.current;
        stepIdRef.current = null;
        const idx = backStepStack.findIndex(s => s.id === id);
        if (idx !== -1) {
          backStepStack.splice(idx, 1);
          isSilentPop = true;
          window.history.back();
        }
      }
    };
  }, [currentFolderId]);
}

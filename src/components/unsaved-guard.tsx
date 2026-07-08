"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type PendingGuard = {
  draftText: string;
  onSave: () => Promise<void> | void;
};

type ModalState = {
  draftText: string;
  onSave: () => Promise<void> | void;
  pendingNavigate: () => void;
};

type UnsavedGuardContextValue = {
  attemptNavigate: (navigate: () => void) => void;
  registerGuard: (guard: PendingGuard | null) => void;
};

const UnsavedGuardContext = createContext<UnsavedGuardContextValue | null>(null);

// Generic "unsaved changes" guard, reusable across any text-entry panel.
// A panel with dirty draft text calls useUnsavedGuardRegistration to
// register itself; anything that navigates away (tab switch, internal
// link) should route through useAttemptNavigate()'s attemptNavigate
// instead of navigating directly, so a dirty draft always gets a chance
// to be saved first.
export function UnsavedGuardProvider({ children }: { children: React.ReactNode }) {
  const guardRef = useRef<PendingGuard | null>(null);
  const [modalState, setModalState] = useState<ModalState | null>(null);
  const [saving, setSaving] = useState(false);

  const registerGuard = useCallback((guard: PendingGuard | null) => {
    guardRef.current = guard;
  }, []);

  const attemptNavigate = useCallback((navigate: () => void) => {
    const guard = guardRef.current;
    if (guard) {
      setModalState({ draftText: guard.draftText, onSave: guard.onSave, pendingNavigate: navigate });
    } else {
      navigate();
    }
  }, []);

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (guardRef.current) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  async function handleYes() {
    if (!modalState) return;
    setSaving(true);
    try {
      await modalState.onSave();
    } finally {
      setSaving(false);
    }
    guardRef.current = null;
    modalState.pendingNavigate();
    setModalState(null);
  }

  function handleNo() {
    if (!modalState) return;
    guardRef.current = null;
    modalState.pendingNavigate();
    setModalState(null);
  }

  return (
    <UnsavedGuardContext.Provider value={{ attemptNavigate, registerGuard }}>
      {children}
      {modalState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl dark:bg-neutral-900">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              You have an unsaved note
            </h2>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Would you like to save it before navigating away?
            </p>
            <div className="mt-3 max-h-40 overflow-y-auto rounded-md border border-neutral-200 bg-neutral-50 p-2.5 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300">
              {modalState.draftText}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleNo}
                disabled={saving}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Exit without saving
              </button>
              <button
                type="button"
                onClick={handleYes}
                disabled={saving}
                className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-contrast hover:bg-accent-hover disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </UnsavedGuardContext.Provider>
  );
}

// Called by a text-entry panel to register its current dirty draft. Pass
// null draftText (or empty string) when there's nothing unsaved.
export function useUnsavedGuardRegistration(draftText: string, onSave: () => Promise<void> | void) {
  const ctx = useContext(UnsavedGuardContext);
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    if (!ctx) return;
    const trimmed = draftText.trim();
    ctx.registerGuard(trimmed ? { draftText: trimmed, onSave: () => onSaveRef.current() } : null);
    return () => ctx.registerGuard(null);
  }, [ctx, draftText]);
}

export function useAttemptNavigate(): (navigate: () => void) => void {
  const ctx = useContext(UnsavedGuardContext);
  return ctx?.attemptNavigate ?? ((navigate) => navigate());
}

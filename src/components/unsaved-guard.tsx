"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type PendingGuard = {
  label: string;
  preview: string;
  onSave: () => Promise<void> | void;
};

type ActiveGuard = PendingGuard & { key: string };

type ModalState = {
  guards: ActiveGuard[];
  pendingNavigate: () => void;
};

type UnsavedGuardContextValue = {
  attemptNavigate: (navigate: () => void) => void;
  registerGuard: (key: string, guard: PendingGuard | null) => void;
};

const UnsavedGuardContext = createContext<UnsavedGuardContextValue | null>(null);

// Generic "unsaved changes" guard, reusable across any panel with
// something transient that can be lost — a note draft, an accumulating
// but not-yet-logged timer. Each source registers itself under its own
// key via useUnsavedGuardRegistration; anything that navigates away
// (tab switch, internal link, page close) should route through
// useAttemptNavigate()'s attemptNavigate instead of navigating
// directly, so any active guard gets a chance to save first. Multiple
// guards can be active at once — the modal lists all of them and Save
// saves them all before navigating.
export function UnsavedGuardProvider({ children }: { children: React.ReactNode }) {
  const guardsRef = useRef<Map<string, PendingGuard>>(new Map());
  const [modalState, setModalState] = useState<ModalState | null>(null);
  const [saving, setSaving] = useState(false);

  const registerGuard = useCallback((key: string, guard: PendingGuard | null) => {
    if (guard) {
      guardsRef.current.set(key, guard);
    } else {
      guardsRef.current.delete(key);
    }
  }, []);

  const attemptNavigate = useCallback((navigate: () => void) => {
    if (guardsRef.current.size > 0) {
      const guards = [...guardsRef.current.entries()].map(([key, g]) => ({ key, ...g }));
      setModalState({ guards, pendingNavigate: navigate });
    } else {
      navigate();
    }
  }, []);

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (guardsRef.current.size > 0) {
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
      for (const guard of modalState.guards) {
        await guard.onSave();
        guardsRef.current.delete(guard.key);
      }
    } finally {
      setSaving(false);
    }
    modalState.pendingNavigate();
    setModalState(null);
  }

  function handleNo() {
    if (!modalState) return;
    for (const guard of modalState.guards) {
      guardsRef.current.delete(guard.key);
    }
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
              You have unsaved work
            </h2>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Would you like to save it before navigating away?
            </p>
            <div className="mt-3 max-h-40 space-y-2 overflow-y-auto">
              {modalState.guards.map((guard) => (
                <div
                  key={guard.key}
                  className="rounded-md border border-neutral-200 bg-neutral-50 p-2.5 text-sm dark:border-neutral-800 dark:bg-neutral-950"
                >
                  <div className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    {guard.label}
                  </div>
                  <div className="mt-0.5 text-neutral-700 dark:text-neutral-300">{guard.preview}</div>
                </div>
              ))}
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

// Called by a panel to register (or clear) its own unsaved-work guard
// under a stable key. Pass an empty preview to clear the guard.
export function useUnsavedGuardRegistration(
  key: string,
  label: string,
  preview: string,
  onSave: () => Promise<void> | void
) {
  const ctx = useContext(UnsavedGuardContext);
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    if (!ctx) return;
    const trimmed = preview.trim();
    ctx.registerGuard(key, trimmed ? { label, preview: trimmed, onSave: () => onSaveRef.current() } : null);
    return () => ctx.registerGuard(key, null);
  }, [ctx, key, label, preview]);
}

export function useAttemptNavigate(): (navigate: () => void) => void {
  const ctx = useContext(UnsavedGuardContext);
  return ctx?.attemptNavigate ?? ((navigate) => navigate());
}

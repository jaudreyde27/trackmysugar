"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { addManualMonitoringSession } from "@/app/actions/monitoring";
import { useUnsavedGuardRegistration } from "@/components/unsaved-guard";

function storageKey(patientId: string): string {
  return `chart-review-timer:${patientId}`;
}

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => n.toString().padStart(2, "0")).join(":");
}

type ChartReviewTimerContextValue = {
  elapsed: number;
  running: boolean;
  logging: boolean;
  toggleRunning: () => void;
  logTime: () => Promise<void>;
};

const ChartReviewTimerContext = createContext<ChartReviewTimerContextValue | null>(null);

// Owns the chart-review timer's state so both the ambient controls
// (play/pause/+, shown on the tabs bar) and the "please start the
// timer" lock overlay (shown over the record below) can share it,
// without threading state through every layer in between.
export function ChartReviewTimerProvider({
  patientId,
  children,
}: {
  patientId: string;
  children: React.ReactNode;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [logging, setLogging] = useState(false);

  // localStorage isn't available during SSR, so this has to run post-mount
  // — the effect (not a lazy useState initializer) is what keeps the
  // server-rendered "00:00:00" and the client's first render in sync,
  // avoiding a hydration mismatch, at the cost of one extra render once the
  // real value loads.
  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey(patientId));
    const parsed = raw ? Number(raw) : 0;
    if (Number.isFinite(parsed) && parsed > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setElapsed(parsed);
    }
  }, [patientId]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (elapsed > 0) {
      window.localStorage.setItem(storageKey(patientId), String(elapsed));
    } else {
      window.localStorage.removeItem(storageKey(patientId));
    }
  }, [elapsed, patientId]);

  async function logTime() {
    if (elapsed <= 0 || logging) return;
    setLogging(true);
    setRunning(false);
    try {
      await addManualMonitoringSession(patientId, {
        occurredAt: new Date().toISOString(),
        minutes: Math.floor(elapsed / 60),
        seconds: elapsed % 60,
        notes: "Chart review",
      });
      setElapsed(0);
    } finally {
      setLogging(false);
    }
  }

  // Leaving the page (or clicking away) with time on the clock that
  // hasn't been logged prompts to save it first, same as an unsaved
  // note — this is what's actually accruing billable monitoring time.
  useUnsavedGuardRegistration(
    "chart-review-timer",
    "Unsaved monitoring time",
    elapsed > 0 ? formatElapsed(elapsed) : "",
    logTime
  );

  return (
    <ChartReviewTimerContext.Provider
      value={{ elapsed, running, logging, toggleRunning: () => setRunning((r) => !r), logTime }}
    >
      {children}
    </ChartReviewTimerContext.Provider>
  );
}

function useChartReviewTimer(): ChartReviewTimerContextValue {
  const ctx = useContext(ChartReviewTimerContext);
  if (!ctx) throw new Error("useChartReviewTimer must be used within a ChartReviewTimerProvider");
  return ctx;
}

// The ambient play/pause/+ widget, shown on the tabs bar. Elapsed time
// persists in localStorage per patient so navigating away and back
// doesn't lose an unlogged session, but it always resumes paused:
// leaving the page is never allowed to keep silently racking up time.
export function ChartReviewTimerControls() {
  const { elapsed, running, logging, toggleRunning, logTime } = useChartReviewTimer();

  return (
    <div className="flex items-center gap-2">
      <span className="min-w-[4.75rem] text-right text-sm font-medium tabular-nums text-neutral-700 dark:text-neutral-300">
        {formatElapsed(elapsed)}
      </span>
      <button
        type="button"
        onClick={toggleRunning}
        aria-label={running ? "Pause chart review timer" : "Start chart review timer"}
        title={running ? "Pause" : "Start"}
        className="flex h-7 w-7 items-center justify-center rounded-md border border-neutral-300 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        {running ? (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
            <rect x={5} y={4} width={3.5} height={12} rx={1} />
            <rect x={11.5} y={4} width={3.5} height={12} rx={1} />
          </svg>
        ) : (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
            <path d="M6 4.5v11l9-5.5-9-5.5z" />
          </svg>
        )}
      </button>
      <button
        type="button"
        onClick={() => void logTime()}
        disabled={elapsed === 0 || logging}
        title="Log this time to Monitoring"
        aria-label="Log chart review time to Monitoring"
        className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-sm font-semibold text-accent-contrast hover:bg-accent-hover disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}

// A gentle, floating reminder — not a veil over the whole record (too
// obstructive), just a soft-pulsing pill anchored near the bottom of
// the screen, nudging the CDCES to start the timer. Disappears the
// moment it's running; clicking it starts the timer directly.
export function ChartReviewFloatingPrompt() {
  const { running, toggleRunning } = useChartReviewTimer();
  if (running) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-30 flex justify-center px-4">
      <button
        type="button"
        onClick={toggleRunning}
        className="pointer-events-auto flex animate-pulse items-center gap-2 rounded-full border border-accent-border bg-white px-5 py-2.5 text-sm font-medium text-accent shadow-lg hover:animate-none hover:bg-accent-subtle dark:bg-neutral-900"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
          <path d="M6 4.5v11l9-5.5-9-5.5z" />
        </svg>
        Press play to start monitoring time
      </button>
    </div>
  );
}

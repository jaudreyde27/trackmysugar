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

// A soft reminder veil over the record below — visible whenever the
// timer isn't running, to nudge the CDCES to start it before digging
// into the chart. It's not a real lock: pointer-events stay disabled
// on the overlay itself so every click passes straight through to
// whatever's underneath.
export function ChartReviewLockOverlay() {
  const { running } = useChartReviewTimer();
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 z-20 rounded-lg backdrop-blur-[1px] transition-opacity duration-300 ${
        running ? "opacity-0" : "opacity-100"
      } bg-accent-subtle/80 dark:bg-accent-subtle/75`}
    >
      <div className="sticky top-4 mx-auto mt-4 w-fit rounded-full border border-accent-border bg-white/90 px-3 py-1 text-xs font-medium text-accent shadow-sm dark:bg-neutral-900/90">
        ▶ Press play to start monitoring time
      </div>
    </div>
  );
}

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

// The primary timer control, anchored at the top of the record column
// (where "Start RPM Call" used to live) — click to start or stop, a
// readout, and a log button to commit the elapsed time to this patient's
// monthly RPM monitoring total. Elapsed time persists in localStorage per
// patient so navigating away and back doesn't lose an unlogged session,
// but it always resumes paused: leaving the page is never allowed to keep
// silently racking up time.
export function MassiveChartTimer() {
  const { elapsed, running, logging, toggleRunning, logTime } = useChartReviewTimer();

  return (
    <div className="flex items-center gap-3 rounded-lg border border-neutral-200 px-4 py-3 dark:border-neutral-800">
      <button
        type="button"
        onClick={toggleRunning}
        aria-label={running ? "Pause monitoring timer" : "Start monitoring timer"}
        title={running ? "Pause" : "Start"}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors ${
          running
            ? "bg-red-600 text-white hover:bg-red-700"
            : "bg-accent text-accent-contrast hover:bg-accent-hover"
        }`}
      >
        {running ? (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
            <rect x={5} y={4} width={3.5} height={12} rx={1} />
            <rect x={11.5} y={4} width={3.5} height={12} rx={1} />
          </svg>
        ) : (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 translate-x-0.5" aria-hidden>
            <path d="M6 4.5v11l9-5.5-9-5.5z" />
          </svg>
        )}
      </button>
      <span className="flex-1 text-xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
        {formatElapsed(elapsed)}
      </span>
      <button
        type="button"
        onClick={() => void logTime()}
        disabled={elapsed === 0 || logging}
        title="Log this time to RPM monitoring"
        className="rounded-md bg-accent-subtle px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent-subtle/70 disabled:opacity-40"
      >
        {logging ? "Logging…" : "Log time"}
      </button>
    </div>
  );
}

// A floating reminder nudging the CDCES to start the timer — centered on
// screen (not tucked in a corner) so it can't be missed, but pointer-events
// only attach to the pill itself so the record underneath stays clickable.
// Stays hidden until the visitor has scrolled down into the glucose stat
// tiles (Avg glucose / Time in range / Est. A1C) and beyond — no point
// nagging before there's anything worth reviewing on screen — and
// disappears the moment the timer is running.
export function ChartReviewFloatingPrompt() {
  const { running, toggleRunning } = useChartReviewTimer();
  const [reachedRecord, setReachedRecord] = useState(false);

  useEffect(() => {
    const target = document.getElementById("rpm-stat-tiles");
    if (!target) return;
    // Stays visible for the stat tiles and everything below them, not just
    // while the (short) tile row itself is on screen — so this checks "has
    // the region's top scrolled above the viewport's bottom edge" rather
    // than "is it currently intersecting," which would flip back off the
    // moment the tile row itself scrolls out of view.
    const observer = new IntersectionObserver(([entry]) => {
      setReachedRecord(entry.boundingClientRect.top <= window.innerHeight);
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  if (running || !reachedRecord) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center bg-black/5 px-4 dark:bg-black/25">
      <button
        type="button"
        onClick={toggleRunning}
        className="pointer-events-auto flex animate-pulse items-center gap-2.5 rounded-full border border-accent-border bg-white px-6 py-3.5 text-base font-semibold text-accent shadow-2xl hover:animate-none hover:bg-accent-subtle dark:bg-neutral-900"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
          <path d="M6 4.5v11l9-5.5-9-5.5z" />
        </svg>
        Press play to start monitoring time
      </button>
    </div>
  );
}

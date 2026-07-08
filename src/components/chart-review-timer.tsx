"use client";

import { useEffect, useState } from "react";
import { addManualMonitoringSession } from "@/app/actions/monitoring";

function storageKey(patientId: string): string {
  return `chart-review-timer:${patientId}`;
}

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => n.toString().padStart(2, "0")).join(":");
}

// A lightweight ambient timer for chart-review time, distinct from the
// live-call workflow — a CDCES starts it while reading through a patient's
// record, and logs whatever's accumulated whenever they choose to. Elapsed
// time persists in localStorage per patient so navigating away and back
// doesn't lose an unlogged session, but it always resumes paused: leaving
// the page is never allowed to keep silently racking up time, and starting
// the clock again is always a deliberate click.
export function ChartReviewTimer({ patientId }: { patientId: string }) {
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

  async function handleLog() {
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

  return (
    <div className="flex items-center gap-2">
      <span className="min-w-[4.75rem] text-right text-sm font-medium tabular-nums text-neutral-700 dark:text-neutral-300">
        {formatElapsed(elapsed)}
      </span>
      <button
        type="button"
        onClick={() => setRunning((r) => !r)}
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
        onClick={() => void handleLog()}
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

"use client";

import { useMemo, useState } from "react";
import { addManualMonitoringSession, removeMonitoringSession } from "@/app/actions/monitoring";

export type MonitoringRow = {
  id: string;
  occurredAt: string;
  staffName: string;
  durationSeconds: number;
  source: "CALL" | "NOTE" | "MANUAL";
  notes: string;
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Live Connect is time on an actual call with the patient; everything
// else (chart review, manual entries, note-attached time) is Review Time
// — time spent on the record without the patient on the line.
function sessionTypeLabel(source: MonitoringRow["source"]): "Live Connect" | "Review Time" {
  return source === "CALL" ? "Live Connect" : "Review Time";
}

function todayDateValue(): string {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d
    .getDate()
    .toString()
    .padStart(2, "0")}`;
}

const nowYear = new Date().getFullYear();
const nowMonth = new Date().getMonth() + 1;

export function MonitoringTab({
  patientId,
  rows,
  canManage,
}: {
  patientId: string;
  rows: MonitoringRow[];
  canManage: boolean;
}) {
  const [year, setYear] = useState(nowYear);
  const [month, setMonth] = useState(nowMonth); // 1-12

  const [date, setDate] = useState(todayDateValue());
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableYears = useMemo(() => {
    const years = new Set(rows.map((r) => new Date(r.occurredAt).getFullYear()));
    years.add(nowYear);
    return [...years].sort((a, b) => b - a);
  }, [rows]);

  const filtered = useMemo(
    () =>
      rows
        .filter((r) => {
          const d = new Date(r.occurredAt);
          return d.getFullYear() === year && d.getMonth() + 1 === month;
        })
        .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()),
    [rows, year, month]
  );

  const totalSeconds = filtered.reduce((sum, r) => sum + r.durationSeconds, 0);
  const liveConnectSeconds = filtered
    .filter((r) => r.source === "CALL")
    .reduce((sum, r) => sum + r.durationSeconds, 0);
  const reviewSeconds = totalSeconds - liveConnectSeconds;

  async function handleSave() {
    const min = Number(minutes) || 0;
    const sec = Number(seconds) || 0;
    if (min <= 0 && sec <= 0) {
      setError("Enter a duration greater than zero.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await addManualMonitoringSession(patientId, {
        occurredAt: new Date(date).toISOString(),
        minutes: min,
        seconds: sec,
        notes: note,
      });
      setMinutes("");
      setSeconds("");
      setNote("");
      setDate(todayDateValue());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(sessionId: string) {
    await removeMonitoringSession(sessionId, patientId);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">RPM History</h2>
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-950"
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-950"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-neutral-700 dark:text-neutral-300">
        <span>
          Total:{" "}
          <span className="font-semibold tabular-nums">{formatDuration(totalSeconds)}</span> minutes
        </span>
        <span>
          Live Connect:{" "}
          <span className="font-semibold tabular-nums">{formatDuration(liveConnectSeconds)}</span> minutes
        </span>
        <span>
          Review Time:{" "}
          <span className="font-semibold tabular-nums">{formatDuration(reviewSeconds)}</span> minutes
        </span>
      </div>

      {canManage && (
        <>
          <div className="mt-4 grid gap-3 rounded-lg border border-neutral-200 p-3 sm:grid-cols-[auto_auto_auto_1fr_auto] sm:items-end dark:border-neutral-800">
            <label className="text-xs text-neutral-500 dark:text-neutral-400">
              Date
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-0.5 block rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
              />
            </label>
            <label className="text-xs text-neutral-500 dark:text-neutral-400">
              Minutes
              <input
                type="number"
                min={0}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                className="mt-0.5 block w-20 rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
              />
            </label>
            <label className="text-xs text-neutral-500 dark:text-neutral-400">
              Seconds
              <input
                type="number"
                min={0}
                max={59}
                value={seconds}
                onChange={(e) => setSeconds(e.target.value)}
                className="mt-0.5 block w-20 rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
              />
            </label>
            <label className="text-xs text-neutral-500 dark:text-neutral-400">
              Note
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional"
                className="mt-0.5 block w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
              />
            </label>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-contrast hover:bg-accent-hover disabled:opacity-50"
            >
              {saving ? "Saving…" : "+ Save"}
            </button>
          </div>
          {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
        </>
      )}

      <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Staff</th>
              <th className="px-3 py-2">Duration</th>
              <th className="px-3 py-2">Note</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-neutral-500 dark:text-neutral-400">
                  No RPM sessions logged for this month.
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2 text-neutral-700 dark:text-neutral-300">
                    {new Date(row.occurredAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        row.source === "CALL"
                          ? "inline-block whitespace-nowrap rounded-full border border-accent-border bg-accent-subtle px-2 py-0.5 text-xs font-medium text-accent"
                          : "inline-block whitespace-nowrap rounded-full border border-neutral-300 px-2 py-0.5 text-xs font-medium text-neutral-600 dark:border-neutral-700 dark:text-neutral-400"
                      }
                    >
                      {sessionTypeLabel(row.source)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-neutral-700 dark:text-neutral-300">{row.staffName}</td>
                  <td className="px-3 py-2 tabular-nums text-neutral-700 dark:text-neutral-300">
                    {formatDuration(row.durationSeconds)}
                  </td>
                  <td className="px-3 py-2 text-neutral-500 dark:text-neutral-400">{row.notes || "—"}</td>
                  <td className="px-3 py-2 text-right">
                    {canManage && row.source === "MANUAL" && (
                      <button
                        type="button"
                        onClick={() => void handleRemove(row.id)}
                        aria-label="Remove session"
                        className="text-neutral-400 hover:text-red-600 dark:hover:text-red-400"
                      >
                        🗑
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

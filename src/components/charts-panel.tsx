"use client";

import { useMemo, useState } from "react";
import { GlucoseTrendChart } from "@/components/glucose-trend-chart";
import { TimeInRangeBar } from "@/components/time-in-range-bar";
import type { GlucoseStats } from "@/lib/data/glucose-stats";

type Reading = { systemTime: string; value: number };

const DAY_RANGE_OPTIONS = [1, 3, 7] as const;
type DayRange = (typeof DAY_RANGE_OPTIONS)[number];
const DEFAULT_DAY_RANGE: DayRange = 3;

function rangeButtonLabel(days: DayRange): string {
  return days === 1 ? "24H" : `${days}D`;
}

function rangeHeadingLabel(days: DayRange): string {
  return days === 1 ? "last 24 hours" : `last ${days} days`;
}

const ICON_CLASS = "h-4 w-4";
const VIEW_ICONS = {
  chart: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} className={ICON_CLASS} aria-hidden>
      <path d="M2.5 16.5V3.5M2.5 16.5H17.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 13l3-4 2.5 2.5L14.5 6l2.5 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  list: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} className={ICON_CLASS} aria-hidden>
      <path d="M7 5.5h10M7 10h10M7 14.5h10" strokeLinecap="round" />
      <circle cx={3.2} cy={5.5} r={0.9} fill="currentColor" stroke="none" />
      <circle cx={3.2} cy={10} r={0.9} fill="currentColor" stroke="none" />
      <circle cx={3.2} cy={14.5} r={0.9} fill="currentColor" stroke="none" />
    </svg>
  ),
  doc: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} className={ICON_CLASS} aria-hidden>
      <path d="M5.5 2.5h6l3 3v12h-9z" strokeLinejoin="round" />
      <path d="M11.5 2.5v3h3M7.5 10h5M7.5 13h5" strokeLinecap="round" />
    </svg>
  ),
} as const;

function StatTile({ label, value, highlighted }: { label: string; value: string; highlighted?: boolean }) {
  return (
    <div
      className={`rounded-md border px-3 py-2 transition-colors ${
        highlighted
          ? "border-accent-border bg-accent-subtle"
          : "border-neutral-200 dark:border-neutral-800"
      }`}
    >
      <div className="text-[10px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {label}
      </div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
        {value}
      </div>
    </div>
  );
}

export function ChartsPanel({
  readings,
  statsByWindow,
}: {
  readings: Reading[];
  statsByWindow: Record<DayRange, GlucoseStats>;
}) {
  const [dayRange, setDayRange] = useState<DayRange>(DEFAULT_DAY_RANGE);
  const [viewMode, setViewMode] = useState<"chart" | "list" | "doc">("chart");
  const [a1cHighlighted, setA1cHighlighted] = useState(false);

  const stats = statsByWindow[dayRange];

  function handleA1cClick() {
    setA1cHighlighted(true);
    setTimeout(() => setA1cHighlighted(false), 1500);
  }

  const visibleReadings = useMemo(() => {
    if (readings.length === 0) return [];
    const latest = Math.max(...readings.map((r) => new Date(r.systemTime).getTime()));
    const cutoff = latest - dayRange * 24 * 60 * 60 * 1000;
    return readings
      .filter((r) => new Date(r.systemTime).getTime() >= cutoff)
      .slice()
      .reverse();
  }, [readings, dayRange]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          Glucose <span className="font-normal text-neutral-400">· {rangeHeadingLabel(dayRange)}</span>
        </h3>
        <div className="flex items-center gap-1">
          {DAY_RANGE_OPTIONS.map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setDayRange(days)}
              className={
                days === dayRange
                  ? "rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-accent-contrast"
                  : "rounded-md px-2.5 py-1 text-xs font-medium text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
              }
            >
              {rangeButtonLabel(days)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {(
            [
              { mode: "chart" as const, label: "Chart", icon: VIEW_ICONS.chart },
              { mode: "list" as const, label: "List", icon: VIEW_ICONS.list },
              { mode: "doc" as const, label: "Doc", icon: VIEW_ICONS.doc },
            ]
          ).map(({ mode, label, icon }) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              aria-label={`${label} view`}
              title={`${label} view`}
              className={
                mode === viewMode
                  ? "rounded-md border border-neutral-300 bg-neutral-100 p-1.5 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                  : "rounded-md border border-transparent p-1.5 text-neutral-400 hover:border-neutral-200 hover:text-neutral-600 dark:hover:border-neutral-800 dark:hover:text-neutral-300"
              }
            >
              {icon}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleA1cClick}
          className="rounded-md px-2 py-1 text-xs font-medium text-accent hover:bg-accent-subtle"
        >
          A1C
        </button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <StatTile label="Avg glucose" value={stats.averageGlucose != null ? `${stats.averageGlucose.toFixed(0)}` : "—"} />
        <StatTile label="Time in range" value={`${stats.percentInRange.toFixed(0)}%`} />
        <StatTile label="Est. A1C" value={stats.gmi != null ? `${stats.gmi.toFixed(1)}%` : "—"} highlighted={a1cHighlighted} />
      </div>

      <div className="mt-3">
        {viewMode === "chart" && <GlucoseTrendChart readings={readings} dayRange={dayRange} />}
        {viewMode === "list" && (
          <div className="max-h-[220px] overflow-y-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
            {visibleReadings.length === 0 ? (
              <div className="flex h-[80px] items-center justify-center text-sm text-neutral-500 dark:text-neutral-400">
                No glucose data in this window yet.
              </div>
            ) : (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
                  {visibleReadings.map((r, i) => (
                    <tr key={i}>
                      <td className="px-3 py-1.5 text-neutral-500 dark:text-neutral-400">
                        {new Date(r.systemTime).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-neutral-800 dark:text-neutral-200">
                        {r.value} mg/dL
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        {viewMode === "doc" && (
          <div className="flex h-[220px] items-center justify-center rounded-lg border border-dashed border-neutral-300 text-sm text-neutral-500 dark:border-neutral-700">
            Document view coming soon.
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-neutral-200 pt-3 dark:border-neutral-800">
        <TimeInRangeBar stats={stats} />
      </div>
    </div>
  );
}

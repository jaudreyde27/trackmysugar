"use client";

import { useMemo, useState } from "react";
import { PercentileBandChart } from "@/components/percentile-band-chart";
import { TimeInRangeBarChart } from "@/components/time-in-range-bar-chart";

type Reading = { systemTime: string; value: number };

const DAY_RANGE_OPTIONS = [7, 14, 30, 90] as const;
type DayRange = (typeof DAY_RANGE_OPTIONS)[number];
const DEFAULT_DAY_RANGE: DayRange = 14;

// Same ADA/AACE range boundaries used server-side in glucose-stats.ts —
// duplicated here (matching the existing local-constant convention already
// used by glucose-trend-chart.tsx and percentile-band-chart.tsx) so this
// can recompute time-in-range client-side from the same raw readings
// prop, rather than plumbing a second per-window stats query down from
// the server just for this chart.
const RANGE_VERY_LOW = 54;
const RANGE_LOW = 70;
const RANGE_HIGH = 180;
const RANGE_VERY_HIGH = 250;

function computeTimeInRange(readings: Reading[], dayRange: number) {
  const empty = { readingCount: 0, percentVeryLow: 0, percentLow: 0, percentInRange: 0, percentHigh: 0, percentVeryHigh: 0 };
  if (readings.length === 0) return empty;

  const latest = Math.max(...readings.map((r) => new Date(r.systemTime).getTime()));
  const cutoff = latest - dayRange * 24 * 60 * 60 * 1000;
  const windowed = readings.filter((r) => new Date(r.systemTime).getTime() >= cutoff);
  const total = windowed.length;
  if (total === 0) return empty;

  let veryLow = 0;
  let low = 0;
  let inRange = 0;
  let high = 0;
  let veryHigh = 0;
  for (const r of windowed) {
    if (r.value < RANGE_VERY_LOW) veryLow++;
    else if (r.value < RANGE_LOW) low++;
    else if (r.value <= RANGE_HIGH) inRange++;
    else if (r.value <= RANGE_VERY_HIGH) high++;
    else veryHigh++;
  }

  return {
    readingCount: total,
    percentVeryLow: (veryLow / total) * 100,
    percentLow: (low / total) * 100,
    percentInRange: (inRange / total) * 100,
    percentHigh: (high / total) * 100,
    percentVeryHigh: (veryHigh / total) * 100,
  };
}

export function TrendsPanel({ readings }: { readings: Reading[] }) {
  const [dayRange, setDayRange] = useState<DayRange>(DEFAULT_DAY_RANGE);
  const tirStats = useMemo(() => computeTimeInRange(readings, dayRange), [readings, dayRange]);

  return (
    <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            Trends <span className="font-normal text-neutral-400">· last {dayRange} days, by time of day</span>
          </h3>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            Every reading in the window binned into its time of day, showing the spread across days.
          </p>
        </div>
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
              {days}D
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <PercentileBandChart readings={readings} dayRange={dayRange} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-neutral-200 pt-3 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm" style={{ backgroundColor: "#2a78d6", opacity: 0.22 }} />
          25th–75th percentile (IQR)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4" style={{ backgroundColor: "#2a78d6" }} />
          Median
        </span>
      </div>

      <div className="mt-3 border-t border-neutral-200 pt-3 dark:border-neutral-800">
        <h4 className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Time in range · last {dayRange} days
        </h4>
        <div className="mt-2">
          <TimeInRangeBarChart stats={tirStats} />
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { PercentileBandChart } from "@/components/percentile-band-chart";

type Reading = { systemTime: string; value: number };

const DAY_RANGE_OPTIONS = [7, 14, 30, 90] as const;
type DayRange = (typeof DAY_RANGE_OPTIONS)[number];
const DEFAULT_DAY_RANGE: DayRange = 14;

export function TrendsPanel({ readings }: { readings: Reading[] }) {
  const [dayRange, setDayRange] = useState<DayRange>(DEFAULT_DAY_RANGE);

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
                  ? "rounded-md bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
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
          <span className="h-2.5 w-4 rounded-sm" style={{ backgroundColor: "#2a78d6", opacity: 0.1 }} />
          10th–90th percentile
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm" style={{ backgroundColor: "#2a78d6", opacity: 0.22 }} />
          25th–75th percentile (IQR)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4" style={{ backgroundColor: "#2a78d6" }} />
          Median
        </span>
      </div>
    </div>
  );
}

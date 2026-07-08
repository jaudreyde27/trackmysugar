"use client";

import { useState } from "react";
import Link from "next/link";
import type { StaffPerformanceRow } from "@/lib/data/staff-performance";

function formatMinutes(minutes: number): string {
  const total = Math.round(minutes * 60);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}` : `${m}:${s.toString().padStart(2, "0")}`;
}

function PerformanceChart({ rows }: { rows: StaffPerformanceRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.monitoringMinutes));
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.staffUserId} className="flex items-center gap-3">
          <div className="w-32 truncate text-xs text-neutral-600 dark:text-neutral-400">{row.name}</div>
          <div className="h-4 flex-1 rounded-sm bg-neutral-100 dark:bg-neutral-800">
            <div
              className="h-4 rounded-sm bg-blue-500"
              style={{ width: `${Math.max(2, (row.monitoringMinutes / max) * 100)}%` }}
            />
          </div>
          <div className="w-16 text-right text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
            {formatMinutes(row.monitoringMinutes)}
          </div>
        </div>
      ))}
    </div>
  );
}

export function StaffPerformanceView({
  rows,
  year,
  month,
}: {
  rows: StaffPerformanceRow[];
  year: number;
  month: number;
}) {
  const [view, setView] = useState<"table" | "chart">("table");

  return (
    <div>
      <div className="flex items-center gap-1">
        {(["table", "chart"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={
              v === view
                ? "rounded-md bg-accent px-2.5 py-1 text-xs font-medium capitalize text-accent-contrast"
                : "rounded-md px-2.5 py-1 text-xs font-medium capitalize text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            }
          >
            {v === "table" ? "Table View" : "Performance Chart"}
          </button>
        ))}
      </div>

      <div className="mt-3">
        {view === "chart" ? (
          <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
            <PerformanceChart rows={rows} />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2 text-center">Monitoring time</th>
                  <th className="px-3 py-2 text-center">Unique patients</th>
                  <th className="px-3 py-2 text-center">Avg time / patient</th>
                  <th className="px-3 py-2 text-center">Avg notes / patient</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-neutral-500 dark:text-neutral-400">
                      No staff activity in this period.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.staffUserId}>
                      <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200">{row.name}</td>
                      <td className="px-3 py-2 text-center tabular-nums text-neutral-600 dark:text-neutral-400">
                        {formatMinutes(row.monitoringMinutes)}
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums text-neutral-600 dark:text-neutral-400">
                        {row.uniquePatients}
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums text-neutral-600 dark:text-neutral-400">
                        {formatMinutes(row.avgMinutesPerPatient)}
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums text-neutral-600 dark:text-neutral-400">
                        {row.avgNotesPerPatient.toFixed(1)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Link
                          href={`/admin/staff/${row.staffUserId}/trends?year=${year}&month=${month}`}
                          className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                        >
                          Trends
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

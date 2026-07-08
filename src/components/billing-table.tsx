"use client";

import { useMemo, useState } from "react";
import { StatusPill } from "@/components/status-pill";
import { setBilledForPeriod, setCpt99453Completed } from "@/app/actions/billing";
import type { BillingRow } from "@/lib/data/billing";

const CODE_INFO: Record<string, string> = {
  "99453": "One-time setup/patient education checkoff — marked manually, doesn't reset monthly.",
  "99454": "Requires 16+ days of transmitted device data in the calendar month.",
  "99457": "First 20 minutes of RPM treatment management with interactive communication.",
  "99458": "Each additional 20-minute block of interactive RPM time beyond the first.",
  "95251": "CGM interpretation documented this month (via a logged Chart Review).",
};

function CodeCell({
  met,
  code,
  onClick,
}: {
  met: boolean;
  code: string;
  onClick?: () => void;
}) {
  return (
    <div className="group relative flex items-center justify-center gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        className={`text-base ${met ? "text-green-600 dark:text-green-400" : "text-neutral-300 dark:text-neutral-700"} ${
          onClick ? "cursor-pointer hover:opacity-70" : ""
        }`}
        aria-label={`${code}: ${met ? "met" : "not met"}`}
      >
        {met ? "✓" : "✕"}
      </button>
      <span className="cursor-help text-[10px] text-neutral-400" title={CODE_INFO[code]}>
        ⓘ
      </span>
    </div>
  );
}

function formatDuration(minutes: number): string {
  const total = Math.round(minutes * 60);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function BillingTable({
  rows: initialRows,
  year,
  month,
}: {
  rows: BillingRow[];
  year: number;
  month: number;
}) {
  const [rows, setRows] = useState(initialRows);
  const [filter, setFilter] = useState<"all" | "billable" | "billed" | "non_billable">("all");

  const filtered = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.status === filter)),
    [rows, filter]
  );

  async function toggleBilled(row: BillingRow) {
    const nextBilled = row.status !== "billed";
    setRows((prev) =>
      prev.map((r) =>
        r.patientId === row.patientId
          ? { ...r, markedBilledAt: nextBilled ? new Date() : null, status: nextBilled ? "billed" : "billable" }
          : r
      )
    );
    await setBilledForPeriod(row.patientId, year, month, nextBilled);
  }

  async function toggle99453(row: BillingRow) {
    const next = !row.eligibility.code99453;
    setRows((prev) =>
      prev.map((r) =>
        r.patientId === row.patientId
          ? {
              ...r,
              eligibility: {
                ...r.eligibility,
                code99453: next,
                code99453CompletedAt: next ? new Date() : null,
              },
            }
          : r
      )
    );
    await setCpt99453Completed(row.patientId, next);
  }

  return (
    <div>
      <div className="flex items-center gap-1">
        {(
          [
            { key: "all" as const, label: "All" },
            { key: "billable" as const, label: "Billable" },
            { key: "billed" as const, label: "Billed" },
            { key: "non_billable" as const, label: "Non-billable" },
          ]
        ).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={
              key === filter
                ? "rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-accent-contrast"
                : "rounded-md px-2.5 py-1 text-xs font-medium text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            }
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-3 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2 text-center">RPM (time)</th>
              <th className="px-3 py-2 text-center">Days</th>
              <th className="px-3 py-2 text-center">Setup</th>
              <th className="px-3 py-2 text-center">99453</th>
              <th className="px-3 py-2 text-center">99454</th>
              <th className="px-3 py-2 text-center">99457</th>
              <th className="px-3 py-2 text-center">99458</th>
              <th className="px-3 py-2 text-center">95251</th>
              <th className="px-3 py-2 text-center">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-3 py-6 text-center text-neutral-500 dark:text-neutral-400">
                  No patients in this filter.
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.patientId}>
                  <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200">
                    {row.firstName} {row.lastName}
                  </td>
                  <td className="px-3 py-2 text-center tabular-nums text-neutral-600 dark:text-neutral-400">
                    {formatDuration(row.eligibility.monitoringMinutes)}
                  </td>
                  <td className="px-3 py-2 text-center tabular-nums text-neutral-600 dark:text-neutral-400">
                    {row.eligibility.daysOfReadings}
                  </td>
                  <td className="px-3 py-2 text-center text-xs text-neutral-500 dark:text-neutral-400">
                    {row.eligibility.code99453CompletedAt
                      ? new Date(row.eligibility.code99453CompletedAt).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <CodeCell met={row.eligibility.code99453} code="99453" onClick={() => void toggle99453(row)} />
                  </td>
                  <td className="px-3 py-2">
                    <CodeCell met={row.eligibility.code99454} code="99454" />
                  </td>
                  <td className="px-3 py-2">
                    <CodeCell met={row.eligibility.code99457} code="99457" />
                  </td>
                  <td className="px-3 py-2">
                    <CodeCell met={row.eligibility.code99458} code="99458" />
                  </td>
                  <td className="px-3 py-2">
                    <CodeCell met={row.eligibility.code95251} code="95251" />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button type="button" onClick={() => void toggleBilled(row)}>
                      <StatusPill
                        label={row.status === "billed" ? "Billed" : row.status === "billable" ? "Billable" : "Non-billable"}
                        tone={row.status === "billed" ? "compliant" : row.status === "billable" ? "in_progress" : "non_compliant"}
                      />
                    </button>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <a
                      href={`/api/patients/${row.patientId}/audit-report?year=${year}&month=${month}`}
                      className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                      aria-label="Download audit packet"
                      title="Download audit packet"
                    >
                      ↓
                    </a>
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

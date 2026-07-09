"use client";

import { useState } from "react";
import { setCpt99453Completed } from "@/app/actions/billing";
import type { BillingRow } from "@/lib/data/billing";

// The three CPT groups the billing dashboard is oriented around: setup,
// device supply/data transmission (day-count tiers), and treatment
// management (interactive-minute tiers). A visual gap separates each group
// in the table below.
const CODE_GROUPS: Array<Array<{ code: string; info: string }>> = [
  [{ code: "99453", info: "RPM initial setup & patient education" }],
  [
    { code: "99445", info: "RPM device supply/data transmission (2-15 days)" },
    { code: "99454", info: "RPM device supply/data transmission (16+ days)" },
  ],
  [
    { code: "99470", info: "RPM treatment management, first 10 min" },
    { code: "99457", info: "RPM treatment management, first 20 min" },
    { code: "99458", info: "RPM treatment management, each additional 20 min" },
  ],
];

function CodeHeader({ code, info, groupStart }: { code: string; info: string; groupStart: boolean }) {
  return (
    <th
      className={`px-3 py-2 text-center ${groupStart ? "border-l border-neutral-200 dark:border-neutral-800" : ""}`}
    >
      <span className="inline-flex items-center gap-1">
        {code}
        <span className="cursor-help text-[10px] text-neutral-400" title={info}>
          ⓘ
        </span>
      </span>
    </th>
  );
}

function CodeCell({ met, groupStart, onClick }: { met: boolean; groupStart: boolean; onClick?: () => void }) {
  return (
    <td className={`px-3 py-2 text-center ${groupStart ? "border-l border-neutral-200 dark:border-neutral-800" : ""}`}>
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        className={`text-base ${met ? "text-green-600 dark:text-green-400" : "text-neutral-300 dark:text-neutral-700"} ${
          onClick ? "cursor-pointer hover:opacity-70" : ""
        }`}
      >
        {met ? "✓" : "✕"}
      </button>
    </td>
  );
}

function formatDuration(minutes: number): string {
  const total = Math.round(minutes * 60);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDob(dateOfBirth: Date): string {
  return new Date(dateOfBirth).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
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

  const totalColumns = 5 + CODE_GROUPS.flat().length + 1;

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">DOB</th>
              <th className="px-3 py-2">Provider</th>
              <th className="px-3 py-2 text-center">Transmission Days</th>
              <th className="px-3 py-2 text-center">RPM Time</th>
              {CODE_GROUPS.map((group) =>
                group.map(({ code, info }, i) => (
                  <CodeHeader key={code} code={code} info={info} groupStart={i === 0} />
                ))
              )}
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={totalColumns} className="px-3 py-6 text-center text-neutral-500 dark:text-neutral-400">
                  No billable patients this period.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.patientId}>
                  <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200">
                    {row.firstName} {row.lastName}
                  </td>
                  <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400">{formatDob(row.dateOfBirth)}</td>
                  <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400">
                    {row.supervisingProviderName ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-center tabular-nums text-neutral-600 dark:text-neutral-400">
                    {row.eligibility.daysOfReadings}
                  </td>
                  <td className="px-3 py-2 text-center tabular-nums text-neutral-600 dark:text-neutral-400">
                    {formatDuration(row.eligibility.monitoringMinutes)}
                  </td>
                  <CodeCell met={row.eligibility.code99453} groupStart onClick={() => void toggle99453(row)} />
                  <CodeCell met={row.eligibility.code99445} groupStart />
                  <CodeCell met={row.eligibility.code99454} groupStart={false} />
                  <CodeCell met={row.eligibility.code99470} groupStart />
                  <CodeCell met={row.eligibility.code99457} groupStart={false} />
                  <CodeCell met={row.eligibility.code99458} groupStart={false} />
                  <td className="px-3 py-2 text-right">
                    <a
                      href={`/api/patients/${row.patientId}/audit-report?year=${year}&month=${month}`}
                      className="inline-block rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
                    >
                      Audit Report
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

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DeviceBadges } from "@/components/device-badges";
import { DiagnosisDisplay } from "@/components/diagnosis-display";
import { R30Badge } from "@/components/r30-badge";
import { TimeInRangeBreakdown } from "@/components/time-in-range-breakdown";
import { GriZoneBadge } from "@/components/gri-zone-badge";
import type { GlucoseStats } from "@/lib/data/glucose-stats";
import type { ConnectionState } from "@/lib/data/roster";
import type { CgmDevice, InsulinDeliveryDevice } from "@/generated/prisma/client";

// Dates arrive as ISO strings — Server Components serialize props to the
// client, and formatting only ever needs string slicing/Date parsing here.
export type RosterRow = {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  primaryDiagnosisCode: string;
  cgmDevice: CgmDevice | null;
  insulinDeliveryDevice: InsulinDeliveryDevice | null;
  connectionState: ConnectionState;
  lastSyncSuccessAt: string | null;
  lastSyncError: string | null;
  r30Count: number;
  enrolledAt: string;
  lastCdcesTouchpointAt: string | null;
  stats: GlucoseStats;
  griScore: number | null;
};

type SortColumn = "riskZone" | "r30" | "enrolled" | "touchpoint";
type SortState = { column: SortColumn; direction: "asc" | "desc" } | null;

function calculateAge(dobIso: string): number {
  const today = new Date();
  const dob = new Date(dobIso);
  let age = today.getFullYear() - dob.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

function formatShortDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
}

function formatDateTime(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function SortHeader({
  label,
  column,
  sort,
  onSort,
}: {
  label: string;
  column: SortColumn;
  sort: SortState;
  onSort: (column: SortColumn) => void;
}) {
  const active = sort?.column === column;
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className="inline-flex items-center gap-1 font-medium uppercase tracking-wide text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
    >
      {label}
      <span className="text-[9px] text-neutral-400 dark:text-neutral-500">
        {active ? (sort.direction === "asc" ? "▲" : "▼") : "⇅"}
      </span>
    </button>
  );
}

export function PatientRosterTable({ roster }: { roster: RosterRow[] }) {
  const [sort, setSort] = useState<SortState>(null);

  function toggleSort(column: SortColumn) {
    setSort((prev) => {
      if (!prev || prev.column !== column) return { column, direction: "asc" };
      if (prev.direction === "asc") return { column, direction: "desc" };
      return null;
    });
  }

  const sorted = useMemo(() => {
    if (!sort) return roster;
    const dir = sort.direction === "asc" ? 1 : -1;
    const copy = [...roster];
    copy.sort((a, b) => {
      switch (sort.column) {
        case "riskZone": {
          const av = a.griScore ?? -1;
          const bv = b.griScore ?? -1;
          return (av - bv) * dir;
        }
        case "r30":
          return (a.r30Count - b.r30Count) * dir;
        case "enrolled":
          return a.enrolledAt.localeCompare(b.enrolledAt) * dir;
        case "touchpoint":
          return (a.lastCdcesTouchpointAt ?? "").localeCompare(b.lastCdcesTouchpointAt ?? "") * dir;
        default:
          return 0;
      }
    });
    return copy;
  }, [roster, sort]);

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
      <table className="w-full min-w-[1200px] text-left text-sm">
        <thead className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
          <tr>
            <th className="px-4 py-3 font-medium">Patient</th>
            <th className="px-4 py-3 font-medium">Primary diagnosis</th>
            <th className="px-4 py-3 font-medium">Sensors</th>
            <th className="px-4 py-3 font-medium">
              <SortHeader label="R30" column="r30" sort={sort} onSort={toggleSort} />
            </th>
            <th className="px-4 py-3 font-medium">Time in range</th>
            <th className="px-4 py-3 font-medium">
              <SortHeader label="Glycemia risk zone" column="riskZone" sort={sort} onSort={toggleSort} />
            </th>
            <th className="px-4 py-3 font-medium">Avg glucose (14d)</th>
            <th className="px-4 py-3 font-medium">Last sync</th>
            <th className="px-4 py-3 font-medium">
              <SortHeader label="Enrolled" column="enrolled" sort={sort} onSort={toggleSort} />
            </th>
            <th className="px-4 py-3 font-medium">
              <SortHeader label="Last CDCES touchpoint" column="touchpoint" sort={sort} onSort={toggleSort} />
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
          {sorted.map((patient) => (
            <tr key={patient.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50">
              <td className="px-4 py-3">
                <Link
                  href={`/patients/${patient.id}`}
                  className="font-medium text-neutral-900 hover:underline dark:text-neutral-100"
                >
                  {patient.lastName}, {patient.firstName}
                </Link>
                <span className="ml-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                  {calculateAge(patient.dateOfBirth)}
                </span>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  DOB {formatShortDate(patient.dateOfBirth)}
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">{patient.mrn}</div>
              </td>
              <td className="px-4 py-3">
                <DiagnosisDisplay code={patient.primaryDiagnosisCode} />
              </td>
              <td className="px-4 py-3">
                <DeviceBadges
                  cgmDevice={patient.cgmDevice}
                  insulinDeliveryDevice={patient.insulinDeliveryDevice}
                />
              </td>
              <td className="px-4 py-3">
                <R30Badge count={patient.r30Count} />
              </td>
              <td className="w-56 px-4 py-3">
                <TimeInRangeBreakdown stats={patient.stats} />
              </td>
              <td className="px-4 py-3">
                <GriZoneBadge score={patient.griScore} />
              </td>
              <td className="px-4 py-3 tabular-nums text-neutral-700 dark:text-neutral-300">
                {patient.stats.averageGlucose != null
                  ? `${patient.stats.averageGlucose.toFixed(0)} mg/dL`
                  : "—"}
              </td>
              <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">
                {patient.connectionState === "NOT_CONNECTED" || patient.connectionState === "REVOKED" ? (
                  <span>Not connected</span>
                ) : (
                  <span
                    className={
                      patient.connectionState === "ERROR" ? "text-[color:var(--status-critical)]" : undefined
                    }
                  >
                    {formatShortDate(patient.lastSyncSuccessAt) ?? "Never"}
                    {patient.connectionState === "ERROR" && " ⚠"}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">
                {formatShortDate(patient.enrolledAt) ?? "—"}
              </td>
              <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">
                {formatDateTime(patient.lastCdcesTouchpointAt) ?? "None logged"}
              </td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={10} className="px-4 py-8 text-center text-neutral-500">
                No patients yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

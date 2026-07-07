"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DeviceBadges } from "@/components/device-badges";
import { DiagnosisDisplay } from "@/components/diagnosis-display";
import { R30Badge } from "@/components/r30-badge";
import { TimeInRangeBreakdown } from "@/components/time-in-range-breakdown";
import { GriZoneBadge } from "@/components/gri-zone-badge";
import { getGriZone, GRI_ZONE_LABELS, type GriZone } from "@/lib/gri";
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

const ZONES: GriZone[] = ["A", "B", "C", "D", "E"];

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

export function PatientRosterTable({ roster }: { roster: RosterRow[] }) {
  const [zoneFilter, setZoneFilter] = useState<Set<GriZone>>(new Set());
  const [r30Min, setR30Min] = useState("");
  const [r30Max, setR30Max] = useState("");
  const [enrolledFrom, setEnrolledFrom] = useState("");
  const [enrolledTo, setEnrolledTo] = useState("");
  const [touchpointFrom, setTouchpointFrom] = useState("");
  const [touchpointTo, setTouchpointTo] = useState("");

  const filtered = useMemo(() => {
    return roster.filter((p) => {
      if (zoneFilter.size > 0) {
        const zone = p.griScore != null ? getGriZone(p.griScore) : null;
        if (!zone || !zoneFilter.has(zone)) return false;
      }
      if (r30Min !== "" && p.r30Count < Number(r30Min)) return false;
      if (r30Max !== "" && p.r30Count > Number(r30Max)) return false;
      if (enrolledFrom && p.enrolledAt.slice(0, 10) < enrolledFrom) return false;
      if (enrolledTo && p.enrolledAt.slice(0, 10) > enrolledTo) return false;
      if (touchpointFrom && (!p.lastCdcesTouchpointAt || p.lastCdcesTouchpointAt.slice(0, 10) < touchpointFrom))
        return false;
      if (touchpointTo && (!p.lastCdcesTouchpointAt || p.lastCdcesTouchpointAt.slice(0, 10) > touchpointTo))
        return false;
      return true;
    });
  }, [roster, zoneFilter, r30Min, r30Max, enrolledFrom, enrolledTo, touchpointFrom, touchpointTo]);

  const hasActiveFilters =
    zoneFilter.size > 0 || r30Min !== "" || r30Max !== "" || enrolledFrom || enrolledTo || touchpointFrom || touchpointTo;

  function toggleZone(zone: GriZone) {
    setZoneFilter((prev) => {
      const next = new Set(prev);
      if (next.has(zone)) next.delete(zone);
      else next.add(zone);
      return next;
    });
  }

  function clearFilters() {
    setZoneFilter(new Set());
    setR30Min("");
    setR30Max("");
    setEnrolledFrom("");
    setEnrolledTo("");
    setTouchpointFrom("");
    setTouchpointTo("");
  }

  return (
    <div>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <div>
          <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Risk zone</div>
          <div className="mt-1.5 flex gap-1">
            {ZONES.map((zone) => (
              <button
                key={zone}
                type="button"
                onClick={() => toggleZone(zone)}
                title={GRI_ZONE_LABELS[zone]}
                className={
                  zoneFilter.has(zone)
                    ? "flex h-7 w-7 items-center justify-center rounded-md bg-neutral-900 text-sm font-semibold text-white dark:bg-neutral-100 dark:text-neutral-900"
                    : "flex h-7 w-7 items-center justify-center rounded-md border border-neutral-300 text-sm font-semibold text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
                }
              >
                {zone}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">R30</div>
          <div className="mt-1.5 flex items-center gap-1.5">
            <input
              type="number"
              min={0}
              max={30}
              placeholder="Min"
              value={r30Min}
              onChange={(e) => setR30Min(e.target.value)}
              className="w-16 rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
            <span className="text-neutral-400">–</span>
            <input
              type="number"
              min={0}
              max={30}
              placeholder="Max"
              value={r30Max}
              onChange={(e) => setR30Max(e.target.value)}
              className="w-16 rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Enrolled</div>
          <div className="mt-1.5 flex items-center gap-1.5">
            <input
              type="date"
              value={enrolledFrom}
              onChange={(e) => setEnrolledFrom(e.target.value)}
              className="rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
            <span className="text-neutral-400">–</span>
            <input
              type="date"
              value={enrolledTo}
              onChange={(e) => setEnrolledTo(e.target.value)}
              className="rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Last CDCES touchpoint</div>
          <div className="mt-1.5 flex items-center gap-1.5">
            <input
              type="date"
              value={touchpointFrom}
              onChange={(e) => setTouchpointFrom(e.target.value)}
              className="rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
            <span className="text-neutral-400">–</span>
            <input
              type="date"
              value={touchpointTo}
              onChange={(e) => setTouchpointTo(e.target.value)}
              className="rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
          >
            Clear filters
          </button>
        )}

        <div className="ml-auto text-xs text-neutral-500 dark:text-neutral-400">
          {filtered.length} of {roster.length} patients
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
        <table className="w-full min-w-[1200px] text-left text-sm">
          <thead className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
            <tr>
              <th className="px-4 py-3 font-medium">Patient</th>
              <th className="px-4 py-3 font-medium">Primary diagnosis</th>
              <th className="px-4 py-3 font-medium">Sensors</th>
              <th className="px-4 py-3 font-medium">R30</th>
              <th className="px-4 py-3 font-medium">Time in range</th>
              <th className="px-4 py-3 font-medium">Glycemia risk zone</th>
              <th className="px-4 py-3 font-medium">Avg glucose (14d)</th>
              <th className="px-4 py-3 font-medium">Last sync</th>
              <th className="px-4 py-3 font-medium">Enrolled</th>
              <th className="px-4 py-3 font-medium">Last CDCES touchpoint</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
            {filtered.map((patient) => (
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
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-neutral-500">
                  {roster.length === 0 ? "No patients yet." : "No patients match the current filters."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

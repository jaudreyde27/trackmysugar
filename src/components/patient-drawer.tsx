"use client";

import Link from "next/link";
import { useEffect } from "react";
import { DeviceBadges } from "@/components/device-badges";
import { DiagnosisDisplay } from "@/components/diagnosis-display";
import { R30Badge } from "@/components/r30-badge";
import { TimeInRangeBreakdown } from "@/components/time-in-range-breakdown";
import { GriZoneBadge } from "@/components/gri-zone-badge";
import type { RosterRow } from "@/components/patient-roster-table";

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

function formatDateTime(iso: string | null): string {
  if (!iso) return "None logged";
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// A quick-glance slide-over rather than a full page navigation — lets a
// clinician triage a patient from the worklist and only jump to the full
// record (notes, monitoring log, billing) when they actually need it.
export function PatientDrawer({ patient, onClose }: { patient: RosterRow | null; onClose: () => void }) {
  useEffect(() => {
    if (!patient) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [patient, onClose]);

  if (!patient) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        type="button"
        aria-label="Close patient preview"
        onClick={onClose}
        className="absolute inset-0 bg-neutral-900/30 dark:bg-neutral-950/60"
      />
      <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex items-start justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
          <div>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              {patient.lastName}, {patient.firstName}
              <span className="ml-1.5 text-sm font-normal text-neutral-500 dark:text-neutral-400">
                {calculateAge(patient.dateOfBirth)}
              </span>
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              MRN {patient.mrn} · {patient.primaryProviderName ?? "Unassigned"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5 px-5 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <DiagnosisDisplay code={patient.primaryDiagnosisCode} />
            <DeviceBadges cgmDevice={patient.cgmDevice} insulinDeliveryDevice={patient.insulinDeliveryDevice} />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2.5 dark:border-neutral-800">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Glycemia risk zone
              </div>
              <div className="mt-0.5">
                <GriZoneBadge score={patient.griScore} />
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                R30 (days transmitted)
              </div>
              <div className="mt-1">
                <R30Badge count={patient.r30Count} />
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Time in range · last 14 days
            </div>
            <div className="mt-2">
              <TimeInRangeBreakdown stats={patient.stats} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Avg glucose (14d)
              </div>
              <div className="mt-0.5 text-sm text-neutral-800 dark:text-neutral-200">
                {patient.stats.averageGlucose != null ? `${patient.stats.averageGlucose.toFixed(0)} mg/dL` : "—"}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Connection
              </div>
              <div className="mt-0.5 text-sm text-neutral-800 dark:text-neutral-200">
                {patient.connectionState === "ACTIVE"
                  ? "Connected"
                  : patient.connectionState === "ERROR"
                    ? "Connection error"
                    : patient.connectionState === "PENDING"
                      ? "Pending"
                      : "Not connected"}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Last CDCES touchpoint
              </div>
              <div className="mt-0.5 text-sm text-neutral-800 dark:text-neutral-200">
                {formatDateTime(patient.lastCdcesTouchpointAt)}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Enrolled
              </div>
              <div className="mt-0.5 text-sm text-neutral-800 dark:text-neutral-200">
                {new Date(patient.enrolledAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-auto border-t border-neutral-200 px-5 py-4 dark:border-neutral-800">
          <Link
            href={`/patients/${patient.id}`}
            className="block w-full rounded-md bg-neutral-900 px-3 py-2 text-center text-sm font-medium text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
          >
            Open full record →
          </Link>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { verifySession } from "@/lib/auth/dal";
import { getPatientRoster } from "@/lib/data/roster";
import { TopNav } from "@/components/top-nav";
import { DeviceBadges } from "@/components/device-badges";
import { DiagnosisDisplay } from "@/components/diagnosis-display";
import { R30Badge } from "@/components/r30-badge";
import { TimeInRangeBreakdown } from "@/components/time-in-range-breakdown";
import { GriZoneBadge } from "@/components/gri-zone-badge";

function formatRelative(date: Date | null): string | null {
  if (!date) return null;
  const diffMs = Date.now() - date.getTime();
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

function formatExactDate(date: Date | null): string {
  if (!date) return "";
  return new Date(date).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatShortDate(date: Date | null): string | null {
  if (!date) return null;
  return new Date(date).toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  const dob = new Date(dateOfBirth);
  let age = today.getFullYear() - dob.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

export default async function HomePage() {
  const session = await verifySession();
  const roster = await getPatientRoster();

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav staffName={session.staffUser.name} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Practice overview
        </h1>

        <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
              <tr>
                <th className="px-4 py-3 font-medium">Patient</th>
                <th className="px-4 py-3 font-medium">Diagnosis</th>
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
              {roster.map((patient) => (
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
                      {patient.mrn}
                    </div>
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
                    {patient.connectionState === "NOT_CONNECTED" ||
                    patient.connectionState === "REVOKED" ? (
                      <span>Not connected</span>
                    ) : (
                      <span
                        title={formatExactDate(patient.lastSyncSuccessAt)}
                        className={
                          patient.connectionState === "ERROR"
                            ? "text-[color:var(--status-critical)]"
                            : undefined
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
                    <span title={formatExactDate(patient.lastCdcesTouchpointAt)}>
                      {formatRelative(patient.lastCdcesTouchpointAt) ?? "None logged"}
                    </span>
                  </td>
                </tr>
              ))}
              {roster.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-neutral-500">
                    No patients yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

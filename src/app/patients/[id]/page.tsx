import Link from "next/link";
import { notFound } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { getPatientDetail } from "@/lib/data/patient-detail";
import { logAudit } from "@/lib/audit";
import { TopNav } from "@/components/top-nav";
import { StreakCalendar } from "@/components/streak-calendar";
import { ConnectionStatusBadge } from "@/components/connection-status-badge";
import { TimeInRangeBreakdown } from "@/components/time-in-range-breakdown";
import { GlucoseTrendChart } from "@/components/glucose-trend-chart";
import { CgmDeviceBadge, PumpDeviceBadge } from "@/components/device-badges";
import { DiagnosisDisplay } from "@/components/diagnosis-display";
import { DaysTransmittedCounter } from "@/components/days-transmitted-counter";
import { PumpPlaceholder } from "@/components/pump-placeholder";
import { MedicationsList } from "@/components/medications-list";
import { disconnectDexcom } from "@/app/actions/dexcom";

function diabetesTypeLabel(type: "TYPE_1" | "TYPE_2") {
  return type === "TYPE_1" ? "Type 1 diabetes" : "Type 2 diabetes";
}

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
}

function formatDateTime(date: Date | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const WINDOWS = [7, 14, 30] as const;

export default async function PatientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ dexcomError?: string }>;
}) {
  const session = await verifySession();
  const { id } = await params;
  const { dexcomError } = await searchParams;

  const patient = await getPatientDetail(id);
  if (!patient) notFound();

  await logAudit({ staffUserId: session.staffUser.id, patientId: id, action: "PATIENT_VIEWED" });

  const primaryStats = patient.statsByWindow[14];
  const boundDisconnect = disconnectDexcom.bind(null, patient.id);

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav staffName={session.staffUser.name} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        <Link href="/" className="text-sm text-neutral-500 hover:underline dark:text-neutral-400">
          ← Practice overview
        </Link>

        <div>
          <h1 className="mt-2 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            {patient.lastName}, {patient.firstName}
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            MRN {patient.mrn} · DOB {formatDate(patient.dateOfBirth)} ·{" "}
            {diabetesTypeLabel(patient.diabetesType)} · Enrolled{" "}
            {formatDate(patient.enrolledAt)}
          </p>
          <div className="mt-2">
            <DiagnosisDisplay code={patient.primaryDiagnosisCode} />
          </div>
        </div>

        {dexcomError && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            Dexcom connection failed. Please try again.
          </div>
        )}

        <section className="mt-6 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                Dexcom connection
              </div>
              <div className="mt-1">
                <ConnectionStatusBadge state={patient.connectionState} />
              </div>
              {patient.connectionState === "ERROR" && patient.lastError && (
                <p className="mt-1 max-w-md text-xs text-red-600 dark:text-red-400">
                  {patient.lastError}
                </p>
              )}
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Last sync attempt: {formatDateTime(patient.lastSyncAttemptAt)} · Last success:{" "}
                {formatDateTime(patient.lastSyncSuccessAt)}
                {patient.environment === "SANDBOX" && " · sandbox data"}
              </p>
            </div>
            {patient.connectionState === "ACTIVE" ? (
              <form action={boundDisconnect}>
                <button
                  type="submit"
                  className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
                >
                  Disconnect
                </button>
              </form>
            ) : (
              <a
                href={`/api/dexcom/connect/${patient.id}`}
                className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
              >
                {patient.connectionState === "ERROR" ? "Reconnect to Dexcom" : "Connect to Dexcom"}
              </a>
            )}
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                CDCES touchpoints
              </div>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Last touchpoint: {formatDateTime(patient.lastCdcesTouchpointAt)}
              </p>
            </div>
            <Link
              href={`/patients/${patient.id}/call`}
              className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
            >
              Start CDCES call
            </Link>
          </div>
        </section>

        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">CGM</h2>
            <CgmDeviceBadge device={patient.cgmDevice} size="md" />
          </div>
          <div className="mt-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
            <DaysTransmittedCounter count={patient.r30Count} />
            <div className="mt-4">
              <StreakCalendar
                days={patient.syncDayHistory.map((d) => ({
                  date: new Date(d.date).toISOString().slice(0, 10),
                  hasData: d.hasData,
                }))}
              />
            </div>
            <div className="mt-4">
              <GlucoseTrendChart
                readings={patient.recentReadings.map((r) => ({
                  systemTime: new Date(r.systemTime).toISOString(),
                  value: r.value,
                }))}
              />
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Pump</h2>
            <PumpDeviceBadge device={patient.insulinDeliveryDevice} size="md" />
          </div>
          <div className="mt-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
            <PumpPlaceholder />
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Statistics</h2>
          <div className="mt-2 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Window</th>
                  <th className="px-4 py-3 font-medium">Avg glucose</th>
                  <th className="px-4 py-3 font-medium">GMI</th>
                  <th className="px-4 py-3 font-medium">Time in range</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
                {WINDOWS.map((w) => {
                  const s = patient.statsByWindow[w];
                  return (
                    <tr key={w}>
                      <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
                        {w} days
                      </td>
                      <td className="px-4 py-3 tabular-nums text-neutral-700 dark:text-neutral-300">
                        {s.averageGlucose != null ? `${s.averageGlucose.toFixed(0)} mg/dL` : "—"}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-neutral-700 dark:text-neutral-300">
                        {s.gmi != null ? `${s.gmi.toFixed(1)}%` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <TimeInRangeBreakdown stats={s} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-neutral-500 dark:text-neutral-400 sm:grid-cols-5">
            <RangeLegend color="var(--status-critical)" label="Very low <54" />
            <RangeLegend color="var(--status-serious)" label="Low 54–69" />
            <RangeLegend color="var(--status-good)" label="In range 70–180" />
            <RangeLegend color="var(--status-warning)" label="High 181–250" />
            <RangeLegend color="var(--status-critical)" label="Very high >250" />
          </div>
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            Based on {primaryStats.readingCount} readings in the last 14 days.
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            Active medications
          </h2>
          <div className="mt-2">
            <MedicationsList medications={patient.activeMedications} />
          </div>
        </section>
      </main>
    </div>
  );
}

function RangeLegend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </div>
  );
}

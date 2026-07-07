import Link from "next/link";
import { notFound } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { getPatientDetail } from "@/lib/data/patient-detail";
import { logAudit } from "@/lib/audit";
import { TopNav } from "@/components/top-nav";
import { StreakCalendar } from "@/components/streak-calendar";
import { GlucoseTrendChart } from "@/components/glucose-trend-chart";
import { CgmDeviceBadge, PumpDeviceBadge } from "@/components/device-badges";
import { CgmStatusLine } from "@/components/cgm-status";
import { DiagnosisDisplay } from "@/components/diagnosis-display";
import { DaysTransmittedCounter } from "@/components/days-transmitted-counter";
import { PumpPlaceholder } from "@/components/pump-placeholder";
import { MedicationsList } from "@/components/medications-list";
import { ContactAndInsuranceCard, type InsuranceRow } from "@/components/contact-and-insurance-card";
import { NotesLogSummary, type NotecardRow } from "@/components/notes-log-summary";
import { DeviceHistorySection } from "@/components/device-history";
import { CdcesTouchpointsList, type TouchpointRow } from "@/components/cdces-touchpoints-list";
import { CallTimer } from "@/components/call-timer";
import { CallNotesEditor } from "@/components/call-notes-editor";
import { generateNotesSummary } from "@/lib/ai/notes-summary";
import { startCdcesCall, endCdcesCall } from "@/app/actions/cdces";

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
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDaysSince(date: Date | null): string | null {
  if (!date) return null;
  const days = Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "Last call: today";
  if (days === 1) return "Last call: 1 day ago";
  return `Last call: ${days} days ago`;
}

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await verifySession();
  const { id } = await params;

  const patient = await getPatientDetail(id);
  if (!patient) notFound();

  await logAudit({ staffUserId: session.staffUser.id, patientId: id, action: "PATIENT_VIEWED" });

  const boundStartCall = startCdcesCall.bind(null, patient.id);
  const activeCallSession = patient.activeCallSession;

  const pastCallSessions = patient.recentCallSessions.filter((s) => s.id !== activeCallSession?.id);
  const touchpointRows: TouchpointRow[] = pastCallSessions.map((s) => ({
    id: s.id,
    startedAt: s.startedAt.toISOString(),
    endedAt: s.endedAt ? s.endedAt.toISOString() : null,
  }));

  const notesSummary = await generateNotesSummary(
    pastCallSessions
      .filter((s) => s.notes.trim().length > 0)
      .map((s) => ({ startedAt: s.startedAt, notes: s.notes }))
  );
  const notecardRows: NotecardRow[] = pastCallSessions.map((s) => ({
    id: s.id,
    startedAt: s.startedAt.toISOString(),
    endedAt: s.endedAt ? s.endedAt.toISOString() : null,
    notes: s.notes,
  }));

  const insuranceRows: InsuranceRow[] = patient.insurancePolicies.map((p) => ({
    id: p.id,
    rank: p.rank,
    payerName: p.payerName,
    memberId: p.memberId,
    groupNumber: p.groupNumber,
    planType: p.planType,
    subscriberRelationship: p.subscriberRelationship,
    subscriberName: p.subscriberName,
  }));

  const hasPump = patient.insulinDeliveryDevice != null && patient.insulinDeliveryDevice !== "MDI";

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
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <CgmDeviceBadge device={patient.cgmDevice} size="md" />
            <PumpDeviceBadge device={patient.insulinDeliveryDevice} size="md" />
          </div>
        </div>

        <section className="mt-6">
          <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            Contact & insurance
          </h2>
          <div className="mt-2">
            <ContactAndInsuranceCard contact={patient.contact} insurance={insuranceRows} />
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-baseline gap-2">
              <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                CDCES touchpoints
              </h2>
              {formatDaysSince(patient.lastCdcesTouchpointAt) && (
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {formatDaysSince(patient.lastCdcesTouchpointAt)}
                </span>
              )}
            </div>
            {!activeCallSession && (
              <form action={boundStartCall}>
                <button
                  type="submit"
                  className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
                >
                  Start CDCES call
                </button>
              </form>
            )}
          </div>

          {activeCallSession && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
                <div>
                  <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    Call in progress
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
                    Started {formatDateTime(activeCallSession.startedAt)}
                  </div>
                </div>
                <CallTimer startedAt={activeCallSession.startedAt.toISOString()} />
              </div>

              <div>
                <h3 className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  Key talking points
                </h3>
                <div className="mt-1 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900/50 dark:text-neutral-300">
                  <ul className="list-inside list-disc space-y-1">
                    {(activeCallSession.talkingPoints ?? "")
                      .split("\n")
                      .map((line) => line.replace(/^[-*]\s*/, "").trim())
                      .filter(Boolean)
                      .map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  Call notes
                </h3>
                <div className="mt-1">
                  <CallNotesEditor sessionId={activeCallSession.id} initialNotes={activeCallSession.notes} />
                </div>
              </div>

              <form action={endCdcesCall.bind(null, activeCallSession.id, patient.id)}>
                <button
                  type="submit"
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  End call
                </button>
              </form>
            </div>
          )}

          <div className="mt-4">
            <CdcesTouchpointsList touchpoints={touchpointRows} />
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">CDCES notes</h2>
          <div className="mt-2">
            <NotesLogSummary summary={notesSummary} sessions={notecardRows} />
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">CGM</h2>
          <div className="mt-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <CgmStatusLine
                cgmDevice={patient.cgmDevice}
                connectionState={patient.connectionState}
                lastError={patient.lastError}
                lastSyncSuccessAt={patient.lastSyncSuccessAt}
                r30Count={patient.r30Count}
                environment={patient.environment}
              />
              <DaysTransmittedCounter count={patient.r30Count} />
            </div>
            <div className="mt-3">
              <StreakCalendar
                days={patient.syncDayHistory.map((d) => ({
                  date: new Date(d.date).toISOString().slice(0, 10),
                  hasData: d.hasData,
                }))}
              />
            </div>
            <div className="mt-3">
              <GlucoseTrendChart
                readings={patient.recentReadings.map((r) => ({
                  systemTime: new Date(r.systemTime).toISOString(),
                  value: r.value,
                }))}
                statsByWindow={patient.statsByWindow}
              />
            </div>
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Pump</h2>
          <div className="mt-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
            <PumpPlaceholder hasPump={hasPump} />
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Device history</h2>
          <div className="mt-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
            <DeviceHistorySection history={patient.deviceHistory} />
          </div>
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

import Link from "next/link";
import { notFound } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { getPatientDetail } from "@/lib/data/patient-detail";
import { logAudit } from "@/lib/audit";
import { TopNav } from "@/components/top-nav";
import { StreakCalendar } from "@/components/streak-calendar";
import { ChartsPanel } from "@/components/charts-panel";
import { CgmDeviceBadge, PumpDeviceBadge } from "@/components/device-badges";
import { CgmStatusLine } from "@/components/cgm-status";
import { DiagnosisDisplay } from "@/components/diagnosis-display";
import { DaysTransmittedCounter } from "@/components/days-transmitted-counter";
import { PumpPlaceholder } from "@/components/pump-placeholder";
import { MedicationsList } from "@/components/medications-list";
import { ContactAndInsuranceCard, type InsuranceRow } from "@/components/contact-and-insurance-card";
import { DeviceHistorySection } from "@/components/device-history";
import { PatientSummaryCard } from "@/components/patient-summary-card";
import { PatientTabs } from "@/components/patient-tabs";
import { NotesPanel, type NoteHistoryRow } from "@/components/notes-panel";
import { CallSection } from "@/components/call-section";
import { MonitoringTab, type MonitoringRow } from "@/components/monitoring-tab";
import { UnsavedGuardProvider } from "@/components/unsaved-guard";
import { generateNotesSummary } from "@/lib/ai/notes-summary";
import { disconnectDexcom } from "@/app/actions/dexcom";

function diabetesTypeLabel(type: "TYPE_1" | "TYPE_2") {
  return type === "TYPE_1" ? "Type 1 diabetes" : "Type 2 diabetes";
}

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
}

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

  if (!session.staffUser.organizationId) notFound();

  const patient = await getPatientDetail(id, session.staffUser.organizationId);
  if (!patient) notFound();

  await logAudit({ staffUserId: session.staffUser.id, patientId: id, action: "PATIENT_VIEWED" });

  const boundDisconnectDexcom = disconnectDexcom.bind(null, patient.id);
  const activeCallSession = patient.activeCallSession;

  const pastSessions = patient.recentMonitoringSessions.filter((s) => s.id !== activeCallSession?.id);

  const notesSummary = await generateNotesSummary(
    pastSessions
      .filter((s) => s.notes.trim().length > 0)
      .map((s) => ({ startedAt: s.occurredAt, notes: s.notes }))
  );

  const noteHistory: NoteHistoryRow[] = pastSessions.map((s) => ({
    id: s.id,
    occurredAt: s.occurredAt.toISOString(),
    notes: s.notes,
    staffName: s.staffUser.name,
    source: s.source,
    durationSeconds: s.durationSeconds,
  }));

  const monitoringRows: MonitoringRow[] = patient.recentMonitoringSessions.map((s) => ({
    id: s.id,
    occurredAt: s.occurredAt.toISOString(),
    staffName: s.staffUser.name,
    durationSeconds: s.durationSeconds,
    source: s.source,
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

  const primaryInsurance = patient.insurancePolicies.find((p) => p.rank === "PRIMARY") ?? null;
  const hasPump = patient.insulinDeliveryDevice != null && patient.insulinDeliveryDevice !== "MDI";
  const daysOfReadingsThisMonth = patient.complianceHistory[0]?.daysOfReadings ?? 0;

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav staffName={session.staffUser.name} isPlatformAdmin={session.staffUser.isPlatformAdmin} hasOrganization={!!session.staffUser.organizationId} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
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

        <section className="mt-6">
          <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Summary</h2>
          <div className="mt-2">
            <PatientSummaryCard
              sex={patient.sex}
              clinicalNotes={patient.clinicalNotes}
              monitoringMinutesThisMonth={patient.monitoringMinutesThisMonth}
              daysOfReadingsThisMonth={daysOfReadingsThisMonth}
              mostRecentReadingAt={patient.mostRecentReadingAt}
              consentDate={patient.consentDate}
              primaryProviderName={patient.primaryProviderName}
              careManagerName={patient.careManagerName}
              primaryInsurance={primaryInsurance}
              phone={patient.contact.phoneMobile ?? patient.contact.phoneHome ?? patient.contact.phoneWork}
              email={patient.contact.email}
              complianceHistory={patient.complianceHistory}
            />
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            Contact & insurance
          </h2>
          <div className="mt-2">
            <ContactAndInsuranceCard contact={patient.contact} insurance={insuranceRows} />
          </div>
        </section>

        <UnsavedGuardProvider>
          <div className="mt-6">
            <PatientTabs
              panels={{
                Readings: (
                  <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
                    <div>
                      <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
                        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                          <CgmStatusLine
                            cgmDevice={patient.cgmDevice}
                            connectionState={patient.connectionState}
                            lastError={patient.lastError}
                            lastSyncSuccessAt={patient.lastSyncSuccessAt}
                            r30Count={patient.r30Count}
                            environment={patient.environment}
                          />
                          <div className="flex items-center gap-3">
                            <DaysTransmittedCounter count={patient.r30Count} />
                            {patient.cgmDevice &&
                              (patient.connectionState === "ACTIVE" ? (
                                <form action={boundDisconnectDexcom}>
                                  <button
                                    type="submit"
                                    className="text-xs font-medium text-neutral-500 underline hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                                  >
                                    Disconnect
                                  </button>
                                </form>
                              ) : (
                                <a
                                  href={`/api/dexcom/connect/${patient.id}`}
                                  className="rounded-md bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
                                >
                                  {patient.connectionState === "ERROR" ? "Reconnect to Dexcom" : "Connect to Dexcom"}
                                </a>
                              ))}
                          </div>
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
                          <ChartsPanel
                            readings={patient.recentReadings.map((r) => ({
                              systemTime: new Date(r.systemTime).toISOString(),
                              value: r.value,
                            }))}
                            statsByWindow={patient.statsByWindow}
                          />
                        </div>
                      </div>

                      <div className="mt-6 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
                        <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Pump</h3>
                        <div className="mt-2">
                          <PumpPlaceholder hasPump={hasPump} />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <CallSection patientId={patient.id} activeCallSession={activeCallSession} />
                      <NotesPanel patientId={patient.id} history={noteHistory} aiSummary={notesSummary} />
                    </div>
                  </div>
                ),
                Devices: (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-4">
                      <CgmDeviceBadge device={patient.cgmDevice} size="md" />
                      <PumpDeviceBadge device={patient.insulinDeliveryDevice} size="md" />
                    </div>
                    <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
                      <DeviceHistorySection history={patient.deviceHistory} />
                    </div>
                  </div>
                ),
                Medications: <MedicationsList medications={patient.activeMedications} />,
                Monitoring: <MonitoringTab patientId={patient.id} rows={monitoringRows} />,
                Messaging: (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Secure messaging isn&apos;t available yet.
                  </p>
                ),
                Docs: (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Document uploads aren&apos;t available yet.
                  </p>
                ),
              }}
            />
          </div>
        </UnsavedGuardProvider>
      </main>
    </div>
  );
}

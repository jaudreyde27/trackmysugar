import { notFound } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { getPatientDetail } from "@/lib/data/patient-detail";
import { logAudit } from "@/lib/audit";
import { AppShell } from "@/components/app-shell";
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
import { MonitoringTab, type MonitoringRow } from "@/components/monitoring-tab";
import { TrendsPanel } from "@/components/trends-panel";
import { UnsavedGuardProvider } from "@/components/unsaved-guard";
import { ChartReviewTimerProvider, ChartReviewFloatingPrompt, MassiveChartTimer } from "@/components/chart-review-timer";
import { generateNotesSummary } from "@/lib/ai/notes-summary";
import { isTouchpointSession } from "@/lib/data/monitoring";
import { stripTemplateBoilerplate } from "@/lib/constants";
import { EnrollmentLinkButton } from "@/components/enrollment-link-button";
import { GuardedLink } from "@/components/guarded-link";

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

function diabetesTypeLabel(type: "TYPE_1" | "TYPE_2") {
  return type === "TYPE_1" ? "Type 1 diabetes" : "Type 2 diabetes";
}

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
}

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await verifySession();
  const { id } = await params;

  if (!session.staffUser.organizationId) notFound();

  const patient = await getPatientDetail(id, session.staffUser.organizationId);
  if (!patient) notFound();

  await logAudit({ staffUserId: session.staffUser.id, patientId: id, action: "PATIENT_VIEWED" });

  const canManage = session.staffUser.portalType === "CDCES";

  // "RPM session" == the same touchpoint definition used for last-CDCES-touchpoint
  // elsewhere (a call, or a note tagged "RPM Completed") — quick notes like
  // "Left Voicemail"/"Chart Comment" alone don't count as a completed session.
  // Rolling 12 months, and boilerplate template text stripped before it's fed
  // to the summary so it reflects only what the CDCES actually wrote.
  const cutoff = new Date().getTime() - ONE_YEAR_MS;
  const rpmSessionsLastYear = patient.recentMonitoringSessions.filter(
    (s) => isTouchpointSession(s) && s.occurredAt.getTime() >= cutoff
  );

  const notesSummary = await generateNotesSummary(
    `${patient.firstName} ${patient.lastName}`,
    rpmSessionsLastYear.map((s) => ({ startedAt: s.occurredAt, notes: stripTemplateBoilerplate(s.notes) }))
  );

  // Only sessions with actual note text become a card in the Notes feed —
  // a call or logged time entry with no notes written is real billable
  // monitoring time (see RPM History), but not a chart entry to display here.
  const noteHistory: NoteHistoryRow[] = patient.recentMonitoringSessions
    .filter((s) => s.notes.trim().length > 0)
    .map((s) => ({
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

  const hasPump = patient.insulinDeliveryDevice != null && patient.insulinDeliveryDevice !== "MDI";

  const recordSection = (
    <div className="mt-6 grid gap-6 lg:grid-cols-[3fr_2fr]">
      <div>
        <PatientTabs
          panels={{
            Readings: (
              <>
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
                      {patient.cgmDevice && patient.connectionState !== "ACTIVE" && (
                        <EnrollmentLinkButton
                          patientId={patient.id}
                          isError={patient.connectionState === "ERROR"}
                        />
                      )}
                    </div>
                  </div>
                  <div className="mt-3">
                    <ChartsPanel
                      readings={patient.recentReadings.map((r) => ({
                        systemTime: new Date(r.systemTime).toISOString(),
                        value: r.value,
                      }))}
                      statsByWindow={patient.statsByWindow}
                      lastSyncSuccessAt={
                        patient.lastSyncSuccessAt ? new Date(patient.lastSyncSuccessAt).toISOString() : null
                      }
                    />
                  </div>
                </div>

                <div className="mt-6 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
                  <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Pump</h3>
                  <div className="mt-2">
                    <PumpPlaceholder hasPump={hasPump} />
                  </div>
                </div>
              </>
            ),
            Trends: (
              <TrendsPanel
                readings={patient.recentReadings.map((r) => ({
                  systemTime: new Date(r.systemTime).toISOString(),
                  value: r.value,
                }))}
              />
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
            "RPM History": (
              <MonitoringTab patientId={patient.id} rows={monitoringRows} canManage={canManage} />
            ),
          }}
        />
      </div>

      <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        {canManage && <MassiveChartTimer />}
        <NotesPanel
          patientId={patient.id}
          history={noteHistory}
          aiSummary={notesSummary}
          canManage={canManage}
        />
      </div>
    </div>
  );

  return (
    <UnsavedGuardProvider>
      <AppShell session={session}>
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <GuardedLink href="/" className="text-sm text-neutral-500 hover:underline dark:text-neutral-400">
          ← Practice overview
        </GuardedLink>

        <div>
          <h1 className="mt-2 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            {patient.firstName} {patient.lastName}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
            <CgmDeviceBadge device={patient.cgmDevice} />
            <PumpDeviceBadge device={patient.insulinDeliveryDevice} />
          </div>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            MRN {patient.mrn} · DOB {formatDate(patient.dateOfBirth)} ·{" "}
            {diabetesTypeLabel(patient.diabetesType)} · Enrolled{" "}
            {formatDate(patient.enrolledAt)}
          </p>
          <div className="mt-2">
            <DiagnosisDisplay code={patient.primaryDiagnosisCode} />
          </div>
        </div>

        <section className="mt-6">
          <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Summary</h2>
          <div className="mt-2">
            <PatientSummaryCard
              firstName={patient.firstName}
              lastName={patient.lastName}
              sex={patient.sex}
              dateOfBirth={patient.dateOfBirth}
              monitoringMinutesThisMonth={patient.monitoringMinutesThisMonth}
              consentDate={patient.consentDate}
              primaryProviderName={patient.primaryProviderName}
              careManagerName={patient.careManagerName}
              lastCdcesTouchpointAt={patient.lastCdcesTouchpointAt}
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

        {canManage ? (
          <ChartReviewTimerProvider patientId={patient.id}>
            {recordSection}
            <ChartReviewFloatingPrompt />
          </ChartReviewTimerProvider>
        ) : (
          recordSection
        )}
        </main>
      </AppShell>
    </UnsavedGuardProvider>
  );
}

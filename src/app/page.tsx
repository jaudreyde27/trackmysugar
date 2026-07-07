import { verifySession } from "@/lib/auth/dal";
import { getPatientRoster } from "@/lib/data/roster";
import { TopNav } from "@/components/top-nav";
import { PracticeWorklist } from "@/components/practice-worklist";
import type { RosterRow } from "@/components/patient-roster-table";

export default async function HomePage() {
  const session = await verifySession();

  // Platform-admin accounts aren't attached to a clinic, so there's no
  // roster to show them here — their view lives under /admin instead.
  if (!session.staffUser.organizationId) {
    return (
      <div className="flex min-h-screen flex-col">
        <TopNav staffName={session.staffUser.name} isPlatformAdmin={session.staffUser.isPlatformAdmin} hasOrganization={!!session.staffUser.organizationId} />
        <main className="mx-auto w-full max-w-[1800px] flex-1 px-6 py-8">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            This account isn&apos;t attached to a clinic. Platform admin tools live under Admin.
          </p>
        </main>
      </div>
    );
  }

  const roster = await getPatientRoster(session.staffUser.organizationId);

  const rows: RosterRow[] = roster.map((patient) => ({
    id: patient.id,
    mrn: patient.mrn,
    firstName: patient.firstName,
    lastName: patient.lastName,
    dateOfBirth: patient.dateOfBirth.toISOString(),
    primaryProviderName: patient.primaryProviderName,
    primaryDiagnosisCode: patient.primaryDiagnosisCode,
    cgmDevice: patient.cgmDevice,
    insulinDeliveryDevice: patient.insulinDeliveryDevice,
    connectionState: patient.connectionState,
    lastSyncSuccessAt: patient.lastSyncSuccessAt?.toISOString() ?? null,
    lastSyncError: patient.lastSyncError,
    r30Count: patient.r30Count,
    enrolledAt: patient.enrolledAt.toISOString(),
    lastCdcesTouchpointAt: patient.lastCdcesTouchpointAt?.toISOString() ?? null,
    stats: patient.stats,
    griScore: patient.griScore,
  }));

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav staffName={session.staffUser.name} isPlatformAdmin={session.staffUser.isPlatformAdmin} hasOrganization={!!session.staffUser.organizationId} />
      <main className="mx-auto w-full max-w-[1800px] flex-1 px-6 py-8">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          {session.staffUser.organizationName} — Practice Overview
        </h1>

        <div className="mt-6">
          <PracticeWorklist roster={rows} />
        </div>
      </main>
    </div>
  );
}

import { verifySession } from "@/lib/auth/dal";
import { getPatientRoster } from "@/lib/data/roster";
import { TopNav } from "@/components/top-nav";
import { PatientRosterTable, type RosterRow } from "@/components/patient-roster-table";

// Filler practice name — swap for the real practice's name when known.
const PRACTICE_NAME = "Alpine Endocrine Associates";

export default async function HomePage() {
  const session = await verifySession();
  const roster = await getPatientRoster();

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
      <TopNav staffName={session.staffUser.name} />
      <main className="mx-auto w-full max-w-[1800px] flex-1 px-6 py-8">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          {PRACTICE_NAME} — Practice Overview
        </h1>

        <div className="mt-6">
          <PatientRosterTable roster={rows} />
        </div>
      </main>
    </div>
  );
}

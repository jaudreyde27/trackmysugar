import "server-only";
import { prisma } from "@/lib/db";
import { getGlucoseStatsForAllPatients, type GlucoseStats } from "@/lib/data/glucose-stats";
import { getR30CountsForAllPatients } from "@/lib/sync/streak";
import { getLastTouchpointForAllPatients } from "@/lib/data/cdces";
import type { CgmDevice, InsulinDeliveryDevice } from "@/generated/prisma/client";

export type ConnectionState = "NOT_CONNECTED" | "PENDING" | "ACTIVE" | "ERROR" | "REVOKED";

export type RosterEntry = {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  primaryDiagnosisCode: string;
  cgmDevice: CgmDevice | null;
  insulinDeliveryDevice: InsulinDeliveryDevice | null;
  connectionState: ConnectionState;
  lastSyncSuccessAt: Date | null;
  lastSyncError: string | null;
  r30Count: number;
  lastCdcesTouchpointAt: Date | null;
  stats: GlucoseStats;
};

const STATS_WINDOW_DAYS = 14;

const EMPTY_STATS_TEMPLATE = {
  readingCount: 0,
  averageGlucose: null,
  gmi: null,
  percentVeryLow: 0,
  percentLow: 0,
  percentInRange: 0,
  percentHigh: 0,
  percentVeryHigh: 0,
} as const;

export async function getPatientRoster(): Promise<RosterEntry[]> {
  const patients = await prisma.patient.findMany({
    where: { active: true },
    include: { dexcomConnection: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const [statsByPatient, r30Counts, lastTouchpoints] = await Promise.all([
    getGlucoseStatsForAllPatients(STATS_WINDOW_DAYS),
    getR30CountsForAllPatients(),
    getLastTouchpointForAllPatients(),
  ]);

  return patients.map((patient) => ({
    id: patient.id,
    mrn: patient.mrn,
    firstName: patient.firstName,
    lastName: patient.lastName,
    primaryDiagnosisCode: patient.primaryDiagnosisCode,
    cgmDevice: patient.cgmDevice,
    insulinDeliveryDevice: patient.insulinDeliveryDevice,
    connectionState: (patient.dexcomConnection?.status ?? "NOT_CONNECTED") as ConnectionState,
    lastSyncSuccessAt: patient.dexcomConnection?.lastSyncSuccessAt ?? null,
    lastSyncError: patient.dexcomConnection?.lastError ?? null,
    r30Count: r30Counts.get(patient.id) ?? 0,
    lastCdcesTouchpointAt: lastTouchpoints.get(patient.id) ?? null,
    stats: statsByPatient.get(patient.id) ?? { patientId: patient.id, ...EMPTY_STATS_TEMPLATE },
  }));
}

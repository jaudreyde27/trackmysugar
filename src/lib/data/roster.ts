import "server-only";
import { prisma } from "@/lib/db";
import { getGlucoseStatsForAllPatients, type GlucoseStats } from "@/lib/data/glucose-stats";
import { getR30CountsForAllPatients } from "@/lib/sync/streak";
import { getLastTouchpointForAllPatients } from "@/lib/data/monitoring";
import { computeGRI } from "@/lib/gri";
import type { CgmDevice, InsulinDeliveryDevice } from "@prisma/client";

export type ConnectionState = "NOT_CONNECTED" | "PENDING" | "ACTIVE" | "ERROR" | "REVOKED";

export type RosterEntry = {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  primaryProviderName: string | null;
  primaryDiagnosisCode: string;
  cgmDevice: CgmDevice | null;
  insulinDeliveryDevice: InsulinDeliveryDevice | null;
  connectionState: ConnectionState;
  lastSyncSuccessAt: Date | null;
  lastSyncError: string | null;
  r30Count: number;
  enrolledAt: Date;
  lastCdcesTouchpointAt: Date | null;
  stats: GlucoseStats;
  griScore: number | null;
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

export async function getPatientRoster(organizationId: string): Promise<RosterEntry[]> {
  const patients = await prisma.patient.findMany({
    where: { active: true, organizationId },
    include: { dexcomConnection: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const [statsByPatient, r30Counts, lastTouchpoints] = await Promise.all([
    getGlucoseStatsForAllPatients(STATS_WINDOW_DAYS),
    getR30CountsForAllPatients(),
    getLastTouchpointForAllPatients(),
  ]);

  return patients.map((patient) => {
    const stats = statsByPatient.get(patient.id) ?? { patientId: patient.id, ...EMPTY_STATS_TEMPLATE };
    return {
      id: patient.id,
      mrn: patient.mrn,
      firstName: patient.firstName,
      lastName: patient.lastName,
      dateOfBirth: patient.dateOfBirth,
      primaryProviderName: patient.primaryProviderName,
      primaryDiagnosisCode: patient.primaryDiagnosisCode,
      cgmDevice: patient.cgmDevice,
      insulinDeliveryDevice: patient.insulinDeliveryDevice,
      connectionState: (patient.dexcomConnection?.status ?? "NOT_CONNECTED") as ConnectionState,
      lastSyncSuccessAt: patient.dexcomConnection?.lastSyncSuccessAt ?? null,
      lastSyncError: patient.dexcomConnection?.lastError ?? null,
      r30Count: r30Counts.get(patient.id) ?? 0,
      enrolledAt: patient.enrolledAt,
      lastCdcesTouchpointAt: lastTouchpoints.get(patient.id) ?? null,
      stats,
      griScore: computeGRI(stats),
    };
  });
}

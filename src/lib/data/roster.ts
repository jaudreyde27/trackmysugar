import "server-only";
import { prisma } from "@/lib/db";
import { getGlucoseStatsForAllPatients, type GlucoseStats } from "@/lib/data/glucose-stats";
import { computeCurrentStreak } from "@/lib/sync/streak";

export type ConnectionState = "NOT_CONNECTED" | "PENDING" | "ACTIVE" | "ERROR" | "REVOKED";

export type RosterEntry = {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  diabetesType: "TYPE_1" | "TYPE_2";
  connectionState: ConnectionState;
  lastSyncSuccessAt: Date | null;
  streak: number;
  stats: GlucoseStats;
};

const STATS_WINDOW_DAYS = 14;

export async function getPatientRoster(): Promise<RosterEntry[]> {
  const patients = await prisma.patient.findMany({
    where: { active: true },
    include: { dexcomConnection: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const [statsByPatient, streaks] = await Promise.all([
    getGlucoseStatsForAllPatients(STATS_WINDOW_DAYS),
    Promise.all(patients.map((p) => computeCurrentStreak(p.id))),
  ]);

  return patients.map((patient, i) => ({
    id: patient.id,
    mrn: patient.mrn,
    firstName: patient.firstName,
    lastName: patient.lastName,
    diabetesType: patient.diabetesType,
    connectionState: (patient.dexcomConnection?.status ?? "NOT_CONNECTED") as ConnectionState,
    lastSyncSuccessAt: patient.dexcomConnection?.lastSyncSuccessAt ?? null,
    streak: streaks[i],
    stats:
      statsByPatient.get(patient.id) ?? {
        patientId: patient.id,
        readingCount: 0,
        averageGlucose: null,
        gmi: null,
        percentVeryLow: 0,
        percentLow: 0,
        percentInRange: 0,
        percentHigh: 0,
        percentVeryHigh: 0,
      },
  }));
}

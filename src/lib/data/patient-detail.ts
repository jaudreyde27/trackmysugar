import "server-only";
import { prisma } from "@/lib/db";
import { getGlucoseStatsForPatient, type GlucoseStats } from "@/lib/data/glucose-stats";
import { computeCurrentStreak } from "@/lib/sync/streak";
import type { ConnectionState } from "@/lib/data/roster";

export type PatientDetail = {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  diabetesType: "TYPE_1" | "TYPE_2";
  connectionState: ConnectionState;
  environment: "SANDBOX" | "PRODUCTION" | null;
  connectedAt: Date | null;
  lastSyncAttemptAt: Date | null;
  lastSyncSuccessAt: Date | null;
  lastError: string | null;
  streak: number;
  statsByWindow: Record<7 | 14 | 30, GlucoseStats>;
  recentReadings: Array<{ systemTime: Date; value: number }>;
  syncDayHistory: Array<{ date: Date; hasData: boolean }>;
};

const CHART_WINDOW_DAYS = 3;
const CALENDAR_WINDOW_DAYS = 30;

export async function getPatientDetail(patientId: string): Promise<PatientDetail | null> {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: { dexcomConnection: true },
  });
  if (!patient) return null;

  const since = new Date(Date.now() - CHART_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const calendarSince = new Date(Date.now() - CALENDAR_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [stats7, stats14, stats30, recentReadings, syncDays, streak] = await Promise.all([
    getGlucoseStatsForPatient(patientId, 7),
    getGlucoseStatsForPatient(patientId, 14),
    getGlucoseStatsForPatient(patientId, 30),
    prisma.glucoseReading.findMany({
      where: { patientId, systemTime: { gte: since } },
      orderBy: { systemTime: "asc" },
      select: { systemTime: true, value: true },
    }),
    prisma.syncDay.findMany({
      where: { patientId, date: { gte: calendarSince } },
      orderBy: { date: "asc" },
      select: { date: true, hasData: true },
    }),
    computeCurrentStreak(patientId),
  ]);

  return {
    id: patient.id,
    mrn: patient.mrn,
    firstName: patient.firstName,
    lastName: patient.lastName,
    dateOfBirth: patient.dateOfBirth,
    diabetesType: patient.diabetesType,
    connectionState: (patient.dexcomConnection?.status ?? "NOT_CONNECTED") as ConnectionState,
    environment: patient.dexcomConnection?.environment ?? null,
    connectedAt: patient.dexcomConnection?.connectedAt ?? null,
    lastSyncAttemptAt: patient.dexcomConnection?.lastSyncAttemptAt ?? null,
    lastSyncSuccessAt: patient.dexcomConnection?.lastSyncSuccessAt ?? null,
    lastError: patient.dexcomConnection?.lastError ?? null,
    streak,
    statsByWindow: { 7: stats7, 14: stats14, 30: stats30 },
    recentReadings,
    syncDayHistory: syncDays,
  };
}

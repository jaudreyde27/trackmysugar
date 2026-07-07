import "server-only";
import { prisma } from "@/lib/db";
import { getGlucoseStatsForPatient, type GlucoseStats } from "@/lib/data/glucose-stats";
import { getR30Count } from "@/lib/sync/streak";
import { getLastTouchpointForPatient } from "@/lib/data/cdces";
import { getActiveMedications } from "@/lib/data/medications";
import type { ConnectionState } from "@/lib/data/roster";
import type { CgmDevice, InsulinDeliveryDevice, Medication } from "@/generated/prisma/client";

export type PatientDetail = {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  enrolledAt: Date;
  diabetesType: "TYPE_1" | "TYPE_2";
  primaryDiagnosisCode: string;
  cgmDevice: CgmDevice | null;
  insulinDeliveryDevice: InsulinDeliveryDevice | null;
  connectionState: ConnectionState;
  environment: "SANDBOX" | "PRODUCTION" | null;
  connectedAt: Date | null;
  lastSyncAttemptAt: Date | null;
  lastSyncSuccessAt: Date | null;
  lastError: string | null;
  r30Count: number;
  lastCdcesTouchpointAt: Date | null;
  statsByWindow: Record<7 | 14 | 30, GlucoseStats>;
  recentReadings: Array<{ systemTime: Date; value: number }>;
  syncDayHistory: Array<{ date: Date; hasData: boolean }>;
  activeMedications: Medication[];
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

  const [stats7, stats14, stats30, recentReadings, syncDays, r30Count, lastCdcesTouchpointAt, activeMedications] =
    await Promise.all([
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
      getR30Count(patientId),
      getLastTouchpointForPatient(patientId),
      getActiveMedications(patientId),
    ]);

  return {
    id: patient.id,
    mrn: patient.mrn,
    firstName: patient.firstName,
    lastName: patient.lastName,
    dateOfBirth: patient.dateOfBirth,
    enrolledAt: patient.enrolledAt,
    diabetesType: patient.diabetesType,
    primaryDiagnosisCode: patient.primaryDiagnosisCode,
    cgmDevice: patient.cgmDevice,
    insulinDeliveryDevice: patient.insulinDeliveryDevice,
    connectionState: (patient.dexcomConnection?.status ?? "NOT_CONNECTED") as ConnectionState,
    environment: patient.dexcomConnection?.environment ?? null,
    connectedAt: patient.dexcomConnection?.connectedAt ?? null,
    lastSyncAttemptAt: patient.dexcomConnection?.lastSyncAttemptAt ?? null,
    lastSyncSuccessAt: patient.dexcomConnection?.lastSyncSuccessAt ?? null,
    lastError: patient.dexcomConnection?.lastError ?? null,
    r30Count,
    lastCdcesTouchpointAt,
    statsByWindow: { 7: stats7, 14: stats14, 30: stats30 },
    recentReadings,
    syncDayHistory: syncDays,
    activeMedications,
  };
}

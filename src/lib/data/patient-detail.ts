import "server-only";
import { prisma } from "@/lib/db";
import { getGlucoseStatsForPatient, type GlucoseStats } from "@/lib/data/glucose-stats";
import { getR30Count } from "@/lib/sync/streak";
import {
  getLastTouchpointForPatient,
  getRecentMonitoringSessions,
  getMonthlyMonitoringTotals,
  type MonitoringSessionWithStaff,
} from "@/lib/data/monitoring";
import { getComplianceHistory, type ComplianceMonth } from "@/lib/data/billing";
import { getActiveMedications } from "@/lib/data/medications";
import type { ConnectionState } from "@/lib/data/roster";
import type {
  CgmDevice,
  InsulinDeliveryDevice,
  Medication,
  InsurancePolicy,
  PhoneType,
  DeviceCategory,
} from "@prisma/client";

export type DeviceHistoryEntry = {
  category: DeviceCategory;
  cgmDevice: CgmDevice | null;
  insulinDeliveryDevice: InsulinDeliveryDevice | null;
  serialNumber: string | null;
  startedAt: Date;
  endedAt: Date | null;
};

export type ContactInfo = {
  email: string | null;
  phoneMobile: string | null;
  phoneHome: string | null;
  phoneWork: string | null;
  preferredPhoneType: PhoneType | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
};

export type PatientDetail = {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  sex: string | null;
  enrolledAt: Date;
  diabetesType: "TYPE_1" | "TYPE_2";
  primaryDiagnosisCode: string;
  cgmDevice: CgmDevice | null;
  insulinDeliveryDevice: InsulinDeliveryDevice | null;
  primaryProviderName: string | null;
  supervisingProviderName: string | null;
  careManagerName: string | null;
  clinicalNotes: string | null;
  consentDate: Date | null;
  cpt99453CompletedAt: Date | null;
  contact: ContactInfo;
  insurancePolicies: InsurancePolicy[];
  connectionState: ConnectionState;
  environment: "SANDBOX" | "PRODUCTION" | null;
  connectedAt: Date | null;
  lastSyncAttemptAt: Date | null;
  lastSyncSuccessAt: Date | null;
  lastError: string | null;
  r30Count: number;
  lastCdcesTouchpointAt: Date | null;
  statsByWindow: Record<1 | 3 | 7, GlucoseStats>;
  recentReadings: Array<{ systemTime: Date; value: number }>;
  syncDayHistory: Array<{ date: Date; hasData: boolean }>;
  activeMedications: Medication[];
  recentMonitoringSessions: MonitoringSessionWithStaff[];
  deviceHistory: DeviceHistoryEntry[];
  complianceHistory: ComplianceMonth[];
  mostRecentReadingAt: Date | null;
  monitoringMinutesThisMonth: number;
};

const CHART_WINDOW_DAYS = 90;
const CALENDAR_WINDOW_DAYS = 30;
// High enough to cover a patient's full monitoring history in practice —
// the AI notes synthesis needs every notecard, not just the most recent few.
const RECENT_NOTES_LIMIT = 100;

export async function getPatientDetail(
  patientId: string,
  organizationId: string
): Promise<PatientDetail | null> {
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, organizationId },
    include: { dexcomConnection: true, insurancePolicies: { orderBy: { rank: "asc" } } },
  });
  if (!patient) return null;

  const since = new Date(Date.now() - CHART_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const calendarSince = new Date(Date.now() - CALENDAR_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [
    stats1,
    stats3,
    stats7,
    recentReadings,
    syncDays,
    r30Count,
    lastCdcesTouchpointAt,
    activeMedications,
    recentMonitoringSessions,
    deviceHistory,
    complianceHistory,
    mostRecentReading,
    monitoringTotalsThisMonth,
  ] = await Promise.all([
    getGlucoseStatsForPatient(patientId, 1),
    getGlucoseStatsForPatient(patientId, 3),
    getGlucoseStatsForPatient(patientId, 7),
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
    getRecentMonitoringSessions(patientId, RECENT_NOTES_LIMIT),
    prisma.deviceHistory.findMany({
      where: { patientId },
      orderBy: [{ category: "asc" }, { startedAt: "asc" }],
      select: {
        category: true,
        cgmDevice: true,
        insulinDeliveryDevice: true,
        serialNumber: true,
        startedAt: true,
        endedAt: true,
      },
    }),
    getComplianceHistory(patientId),
    prisma.glucoseReading.findFirst({
      where: { patientId },
      orderBy: { systemTime: "desc" },
      select: { systemTime: true },
    }),
    getMonthlyMonitoringTotals(patientId, new Date().getUTCFullYear(), new Date().getUTCMonth() + 1),
  ]);

  return {
    id: patient.id,
    mrn: patient.mrn,
    firstName: patient.firstName,
    lastName: patient.lastName,
    dateOfBirth: patient.dateOfBirth,
    sex: patient.sex,
    enrolledAt: patient.enrolledAt,
    diabetesType: patient.diabetesType,
    primaryDiagnosisCode: patient.primaryDiagnosisCode,
    cgmDevice: patient.cgmDevice,
    insulinDeliveryDevice: patient.insulinDeliveryDevice,
    primaryProviderName: patient.primaryProviderName,
    supervisingProviderName: patient.supervisingProviderName,
    careManagerName: patient.careManagerName,
    clinicalNotes: patient.clinicalNotes,
    consentDate: patient.consentDate,
    cpt99453CompletedAt: patient.cpt99453CompletedAt,
    contact: {
      email: patient.email,
      phoneMobile: patient.phoneMobile,
      phoneHome: patient.phoneHome,
      phoneWork: patient.phoneWork,
      preferredPhoneType: patient.preferredPhoneType,
      addressLine1: patient.addressLine1,
      addressLine2: patient.addressLine2,
      city: patient.city,
      state: patient.state,
      postalCode: patient.postalCode,
    },
    insurancePolicies: patient.insurancePolicies,
    connectionState: (patient.dexcomConnection?.status ?? "NOT_CONNECTED") as ConnectionState,
    environment: patient.dexcomConnection?.environment ?? null,
    connectedAt: patient.dexcomConnection?.connectedAt ?? null,
    lastSyncAttemptAt: patient.dexcomConnection?.lastSyncAttemptAt ?? null,
    lastSyncSuccessAt: patient.dexcomConnection?.lastSyncSuccessAt ?? null,
    lastError: patient.dexcomConnection?.lastError ?? null,
    r30Count,
    lastCdcesTouchpointAt,
    statsByWindow: { 1: stats1, 3: stats3, 7: stats7 },
    recentReadings,
    syncDayHistory: syncDays,
    activeMedications,
    recentMonitoringSessions,
    deviceHistory,
    complianceHistory,
    mostRecentReadingAt: mostRecentReading?.systemTime ?? null,
    monitoringMinutesThisMonth: monitoringTotalsThisMonth.totalSeconds / 60,
  };
}

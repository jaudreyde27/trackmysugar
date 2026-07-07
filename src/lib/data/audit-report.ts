import "server-only";
import { prisma } from "@/lib/db";
import { getCptEligibilityForMonth, type CptEligibility } from "@/lib/data/billing";

export type AuditReportData = {
  organizationName: string;
  rpmConsentTemplate: string | null;
  patient: {
    id: string;
    mrn: string;
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    primaryDiagnosisCode: string;
    enrolledAt: Date;
    consentDate: Date | null;
    primaryProviderName: string | null;
    supervisingProviderName: string | null;
    careManagerName: string | null;
    clinicalNotes: string | null;
  };
  devices: Array<{ label: string; serialNumber: string | null }>;
  eligibility: CptEligibility;
  monitoringSessions: Array<{ occurredAt: Date; durationSeconds: number; staffName: string }>;
  readings: Array<{ systemTime: Date; value: number }>;
  year: number;
  month: number;
};

const CGM_LABELS: Record<string, string> = { DEXCOM: "Dexcom", FREESTYLE_LIBRE: "FreeStyle Libre" };
const PUMP_LABELS: Record<string, string> = {
  OMNIPOD: "Omnipod",
  TANDEM: "Tandem",
  MEDTRONIC: "Medtronic",
  MDI: "MDI",
};

export async function getAuditReportData(
  patientId: string,
  organizationId: string,
  year: number,
  month: number
): Promise<AuditReportData | null> {
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, organizationId },
    include: { organization: true },
  });
  if (!patient) return null;

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  const [deviceHistory, monitoringSessions, readings, eligibility] = await Promise.all([
    prisma.deviceHistory.findMany({
      where: { patientId, startedAt: { lt: end }, OR: [{ endedAt: null }, { endedAt: { gte: start } }] },
      select: { category: true, cgmDevice: true, insulinDeliveryDevice: true, serialNumber: true },
    }),
    prisma.monitoringSession.findMany({
      where: { patientId, occurredAt: { gte: start, lt: end } },
      orderBy: { occurredAt: "asc" },
      include: { staffUser: { select: { name: true } } },
    }),
    prisma.glucoseReading.findMany({
      where: { patientId, systemTime: { gte: start, lt: end } },
      orderBy: { systemTime: "asc" },
      select: { systemTime: true, value: true },
    }),
    getCptEligibilityForMonth(patient, year, month),
  ]);

  const devices = deviceHistory.map((d) => ({
    label:
      d.category === "CGM"
        ? (d.cgmDevice && CGM_LABELS[d.cgmDevice]) || "Unknown CGM"
        : (d.insulinDeliveryDevice && PUMP_LABELS[d.insulinDeliveryDevice]) || "Unknown pump",
    serialNumber: d.serialNumber,
  }));

  return {
    organizationName: patient.organization.name,
    rpmConsentTemplate: patient.organization.rpmConsentTemplate,
    patient: {
      id: patient.id,
      mrn: patient.mrn,
      firstName: patient.firstName,
      lastName: patient.lastName,
      dateOfBirth: patient.dateOfBirth,
      primaryDiagnosisCode: patient.primaryDiagnosisCode,
      enrolledAt: patient.enrolledAt,
      consentDate: patient.consentDate,
      primaryProviderName: patient.primaryProviderName,
      supervisingProviderName: patient.supervisingProviderName,
      careManagerName: patient.careManagerName,
      clinicalNotes: patient.clinicalNotes,
    },
    devices,
    eligibility,
    monitoringSessions: monitoringSessions.map((s) => ({
      occurredAt: s.occurredAt,
      durationSeconds: s.durationSeconds,
      staffName: s.staffUser.name,
    })),
    readings,
    year,
    month,
  };
}

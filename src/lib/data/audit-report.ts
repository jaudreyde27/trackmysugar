import "server-only";
import { prisma } from "@/lib/db";
import { getCptEligibilityForMonth } from "@/lib/data/billing";
import { getDiagnosisName } from "@/lib/diagnosis-codes";
import { RPM_CPT_CODES, RPM_CPT_LABELS, type RpmCptCode } from "@/lib/data/reimbursement-rates";
import type { CommunicationMethod, ReadingSource } from "@prisma/client";

const CGM_LABELS: Record<string, string> = { DEXCOM: "Dexcom", FREESTYLE_LIBRE: "FreeStyle Libre" };
const PUMP_LABELS: Record<string, string> = {
  OMNIPOD: "Omnipod",
  TANDEM: "Tandem",
  MEDTRONIC: "Medtronic",
  MDI: "MDI",
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatDate(date: Date | null): string {
  if (!date) return "not on file";
  return new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

// Plain-language description of what a monitoring session actually was —
// derived from existing fields (source + templateUsed) rather than a new
// column, since it's fully determined by data already captured.
function activityDescriptionFor(source: string, templateUsed: string | null): string {
  if (templateUsed) return templateUsed;
  switch (source) {
    case "CALL":
      return "Live patient call";
    case "MANUAL":
      return "Chart review / logged time";
    case "NOTE":
      return "Clinical note";
    default:
      return "Monitoring activity";
  }
}

export type AuditReportMonitoringSession = {
  id: string;
  occurredAt: Date;
  durationSeconds: number;
  staffName: string;
  staffCredential: string | null;
  communicationMethod: CommunicationMethod;
  activityDescription: string;
};

export type AuditReportReadingDay = {
  date: string; // YYYY-MM-DD (UTC)
  readingCount: number;
  devices: string[];
};

export type AuditReportRawReading = {
  date: string; // YYYY-MM-DD (UTC)
  value: number;
  readingSource: ReadingSource;
};

export type AuditReportBillingLine = {
  cptCode: RpmCptCode;
  label: string;
  explanation: string;
  thresholdRequired: string;
  thresholdAchieved: string;
  unitsBilled: number;
};

export type AuditReportData = {
  organizationName: string;
  reportingPeriodLabel: string;
  year: number;
  month: number;
  patient: {
    id: string;
    mrn: string;
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    diagnosisCode: string;
    diagnosisName: string | null;
  };
  programDetails: {
    enrolledAt: Date;
    consentDate: Date | null;
    totalRpmMinutes: number;
    deviceTypes: string[];
    deviceSerials: string[];
    daysOfReadings: number;
  };
  otherDetails: {
    referringProvider: string | null;
    supervisingProvider: string | null;
    organizationName: string;
    careManager: string | null;
    clinicalNotes: string | null;
    cptCodesBilled: string[];
  };
  rpmConsentParagraph: string;
  practiceConsentAddendum: string | null;
  monitoringSessions: AuditReportMonitoringSession[];
  readingDays: AuditReportReadingDay[];
  rawReadings: AuditReportRawReading[];
  billingSummary: AuditReportBillingLine[];
  physicianReview: {
    name: string | null;
    npi: string | null;
    attestation: string;
  };
};

const BILLING_EXPLANATIONS: Record<RpmCptCode, string> = {
  "99453": "Initial device setup and patient education. Billed once per device, once per patient lifetime.",
  "99445": "Device supply/data transmission for 2–15 days of readings in the 30-day period.",
  "99454": "Device supply/data transmission for 16+ days of readings in the 30-day period. Mutually exclusive with 99445.",
  "99470": "First 10–19 minutes of monthly treatment management, requires ≥1 synchronous interactive communication.",
  "99457": "First 20+ minutes of monthly treatment management, requires ≥1 synchronous interactive communication. Mutually exclusive with 99470.",
  "99458": "Each additional 20-minute increment beyond 99457.",
};

const BILLING_THRESHOLD_REQUIRED: Record<RpmCptCode, string> = {
  "99453": "Device setup completed + patient education (once per device lifetime)",
  "99445": "2–15 transmission days in the 30-day period",
  "99454": "16+ transmission days in the 30-day period",
  "99470": "10–19 minutes of monitoring time + ≥1 synchronous communication",
  "99457": "≥20 minutes of monitoring time + ≥1 synchronous communication",
  "99458": "Each additional complete 20-minute increment beyond 99457",
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

  const [deviceHistory, monitoringSessionRows, readingRows, eligibility] = await Promise.all([
    prisma.deviceHistory.findMany({
      where: { patientId, startedAt: { lt: end }, OR: [{ endedAt: null }, { endedAt: { gte: start } }] },
      select: {
        category: true,
        cgmDevice: true,
        insulinDeliveryDevice: true,
        serialNumber: true,
        startedAt: true,
        endedAt: true,
      },
    }),
    prisma.monitoringSession.findMany({
      where: { patientId, occurredAt: { gte: start, lt: end } },
      orderBy: { occurredAt: "asc" },
      include: { staffUser: { select: { name: true } } },
    }),
    prisma.glucoseReading.findMany({
      where: { patientId, systemTime: { gte: start, lt: end } },
      orderBy: { systemTime: "asc" },
      select: { systemTime: true, value: true, readingSource: true },
    }),
    getCptEligibilityForMonth(patient, year, month),
  ]);

  const devices = deviceHistory
    .filter((d) => d.category === "CGM" || d.category === "PUMP")
    .map((d) => ({
      label:
        d.category === "CGM"
          ? (d.cgmDevice && CGM_LABELS[d.cgmDevice]) || "Unknown CGM"
          : (d.insulinDeliveryDevice && PUMP_LABELS[d.insulinDeliveryDevice]) || "Unknown pump",
      serialNumber: d.serialNumber,
    }));

  function cgmLabelForDate(date: Date): string {
    const entry = deviceHistory.find(
      (d) => d.category === "CGM" && d.startedAt <= date && (d.endedAt == null || d.endedAt >= date)
    );
    if (!entry) return "CGM";
    return (entry.cgmDevice && CGM_LABELS[entry.cgmDevice]) || "CGM";
  }

  const monitoringSessions: AuditReportMonitoringSession[] = monitoringSessionRows.map((s) => ({
    id: s.id,
    occurredAt: s.occurredAt,
    durationSeconds: s.durationSeconds,
    staffName: s.staffUser.name,
    staffCredential: s.staffCredential,
    communicationMethod: s.communicationMethod,
    activityDescription: activityDescriptionFor(s.source, s.templateUsed),
  }));
  const totalRpmMinutes = monitoringSessions.reduce((sum, s) => sum + s.durationSeconds, 0) / 60;
  const syncSessionCount = monitoringSessions.filter((s) => s.communicationMethod === "SYNCHRONOUS").length;

  // Grouped by calendar day (UTC) rather than SyncDay — SyncDay is written
  // by the same sync run that inserts these rows, so in practice this
  // reconciles exactly with eligibility.daysOfReadings (used below), but
  // deriving the Readings table straight from GlucoseReading keeps the two
  // guaranteed-consistent without a second query having to agree.
  const dayMap = new Map<string, { count: number; hasAutomatic: boolean; hasManual: boolean }>();
  for (const r of readingRows) {
    const day = r.systemTime.toISOString().slice(0, 10);
    const bucket = dayMap.get(day) ?? { count: 0, hasAutomatic: false, hasManual: false };
    bucket.count += 1;
    if (r.readingSource === "AUTOMATIC") bucket.hasAutomatic = true;
    else bucket.hasManual = true;
    dayMap.set(day, bucket);
  }
  const readingDays: AuditReportReadingDay[] = [...dayMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, bucket]) => {
      const dayDevices: string[] = [];
      if (bucket.hasAutomatic) dayDevices.push(cgmLabelForDate(new Date(date)));
      if (bucket.hasManual) dayDevices.push("Glucometer");
      return { date, readingCount: bucket.count, devices: dayDevices };
    });

  const rawReadings: AuditReportRawReading[] = readingRows.map((r) => ({
    date: r.systemTime.toISOString().slice(0, 10),
    value: r.value,
    readingSource: r.readingSource,
  }));

  const diagnosisName = getDiagnosisName(patient.primaryDiagnosisCode);
  const periodLabel = `${MONTH_NAMES[month - 1]} ${year}`;

  const consentDateLabel = formatDate(patient.consentDate);
  const dxLabel = diagnosisName ? `${patient.primaryDiagnosisCode} (${diagnosisName})` : patient.primaryDiagnosisCode;
  const rpmConsentParagraph =
    `This Remote Physiologic Monitoring (RPM) service is medically necessary for the ongoing management of ` +
    `${patient.firstName} ${patient.lastName}'s diagnosis of ${dxLabel}, supporting clinical decision-making ` +
    `through continuous physiologic data review. The patient consented to participation in this program on ` +
    `${consentDateLabel}. The patient was informed that RPM services may be discontinued by either the patient ` +
    `or the practice at any time, without effect on the patient's other medical care. Per CMS billing guidance, ` +
    `only one qualified health care provider may bill RPM services for this patient in a given calendar month. ` +
    `Standard deductible, coinsurance, and/or copayment cost-sharing applies to RPM services under the patient's ` +
    `insurance plan.`;

  const billedCodes: RpmCptCode[] = RPM_CPT_CODES.filter((code) => {
    switch (code) {
      case "99453":
        return eligibility.code99453;
      case "99445":
        return eligibility.code99445;
      case "99454":
        return eligibility.code99454;
      case "99470":
        return eligibility.code99470;
      case "99457":
        return eligibility.code99457;
      case "99458":
        return eligibility.code99458;
    }
  });

  function thresholdAchievedFor(code: RpmCptCode): string {
    switch (code) {
      case "99453":
        return eligibility.code99453CompletedAt
          ? `Completed ${formatDate(eligibility.code99453CompletedAt)}`
          : "Not yet completed";
      case "99445":
      case "99454":
        return `${eligibility.daysOfReadings} day(s) of readings`;
      case "99470":
      case "99457":
        return `${eligibility.monitoringMinutes.toFixed(0)} min, ${syncSessionCount} synchronous session(s) logged`;
      case "99458":
        return `${eligibility.additional99458Units} additional 20-min block(s) (${eligibility.monitoringMinutes.toFixed(0)} min total)`;
    }
  }

  function unitsBilledFor(code: RpmCptCode): number {
    switch (code) {
      case "99453":
        return eligibility.code99453 ? 1 : 0;
      case "99445":
        return eligibility.code99445 ? 1 : 0;
      case "99454":
        return eligibility.code99454 ? 1 : 0;
      case "99470":
        return eligibility.code99470 ? 1 : 0;
      case "99457":
        return eligibility.code99457 ? 1 : 0;
      case "99458":
        return eligibility.additional99458Units;
    }
  }

  const billingSummary: AuditReportBillingLine[] = billedCodes.map((code) => ({
    cptCode: code,
    label: RPM_CPT_LABELS[code],
    explanation: BILLING_EXPLANATIONS[code],
    thresholdRequired: BILLING_THRESHOLD_REQUIRED[code],
    thresholdAchieved: thresholdAchievedFor(code),
    unitsBilled: unitsBilledFor(code),
  }));

  return {
    organizationName: patient.organization.name,
    reportingPeriodLabel: periodLabel,
    year,
    month,
    patient: {
      id: patient.id,
      mrn: patient.mrn,
      firstName: patient.firstName,
      lastName: patient.lastName,
      dateOfBirth: patient.dateOfBirth,
      diagnosisCode: patient.primaryDiagnosisCode,
      diagnosisName,
    },
    programDetails: {
      enrolledAt: patient.enrolledAt,
      consentDate: patient.consentDate,
      totalRpmMinutes,
      deviceTypes: devices.map((d) => d.label),
      deviceSerials: devices.map((d) => d.serialNumber).filter((s): s is string => Boolean(s)),
      daysOfReadings: eligibility.daysOfReadings,
    },
    otherDetails: {
      referringProvider: patient.primaryProviderName,
      supervisingProvider: patient.supervisingProviderName,
      organizationName: patient.organization.name,
      careManager: patient.careManagerName,
      clinicalNotes: patient.clinicalNotes,
      cptCodesBilled: billedCodes,
    },
    rpmConsentParagraph,
    practiceConsentAddendum: patient.organization.rpmConsentTemplate,
    monitoringSessions,
    readingDays,
    rawReadings,
    billingSummary,
    physicianReview: {
      name: patient.supervisingProviderName,
      npi: patient.supervisingProviderNpi,
      attestation:
        "I attest that the RPM services documented in this report were medically necessary and were provided/supervised in accordance with applicable CMS billing requirements.",
    },
  };
}

import "server-only";
import { prisma } from "@/lib/db";
import {
  getMonthlyMonitoringTotals,
  hasCgmInterpretationForMonth,
} from "@/lib/data/monitoring";

// CMS RPM billing thresholds. 99454 requires 16+ days of transmitted data in
// the calendar month; 99457 is the first 20 interactive minutes, 99458 each
// additional 20-minute block beyond that.
const CPT_99454_MIN_DAYS = 16;
const CPT_99457_MIN_MINUTES = 20;
const CPT_99458_MIN_MINUTES = 40;

// Approximate national-average non-facility Medicare rates, for
// illustrative dollar totals only — NOT a real fee schedule. Swap for the
// org's actual contracted rates before relying on this for real billing.
export const CPT_APPROX_RATES = {
  code99453: 19,
  code99454: 50,
  code99457: 50,
  code99458: 40,
  code95251: 67,
} as const;

export function estimatedDollarsFor(eligibility: CptEligibility): number {
  let total = 0;
  if (eligibility.code99453) total += CPT_APPROX_RATES.code99453;
  if (eligibility.code99454) total += CPT_APPROX_RATES.code99454;
  if (eligibility.code99457) total += CPT_APPROX_RATES.code99457;
  if (eligibility.code99458) total += CPT_APPROX_RATES.code99458;
  if (eligibility.code95251) total += CPT_APPROX_RATES.code95251;
  return total;
}

export type CptEligibility = {
  code99453: boolean; // one-time setup/education checkoff
  code99453CompletedAt: Date | null;
  code99454: boolean; // 16+ days of readings this month
  code99457: boolean; // first 20 interactive minutes
  code99458: boolean; // additional 20-minute block
  code95251: boolean; // CGM interpretation documented
  daysOfReadings: number;
  monitoringMinutes: number;
  interactiveMinutes: number;
};

async function getDaysOfReadingsForMonth(patientId: string, year: number, month: number): Promise<number> {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return prisma.syncDay.count({
    where: { patientId, date: { gte: start, lt: end }, hasData: true },
  });
}

export async function getCptEligibilityForMonth(
  patient: { id: string; cpt99453CompletedAt: Date | null },
  year: number,
  month: number
): Promise<CptEligibility> {
  const [daysOfReadings, totals, hasInterpretation] = await Promise.all([
    getDaysOfReadingsForMonth(patient.id, year, month),
    getMonthlyMonitoringTotals(patient.id, year, month),
    hasCgmInterpretationForMonth(patient.id, year, month),
  ]);

  const monitoringMinutes = totals.totalSeconds / 60;
  const interactiveMinutes = totals.interactiveSeconds / 60;

  return {
    code99453: patient.cpt99453CompletedAt != null,
    code99453CompletedAt: patient.cpt99453CompletedAt,
    code99454: daysOfReadings >= CPT_99454_MIN_DAYS,
    code99457: interactiveMinutes >= CPT_99457_MIN_MINUTES,
    code99458: interactiveMinutes >= CPT_99458_MIN_MINUTES,
    code95251: hasInterpretation,
    daysOfReadings,
    monitoringMinutes,
    interactiveMinutes,
  };
}

export type ComplianceMonth = {
  year: number;
  month: number;
  monthLabel: string;
  daysOfReadings: number;
};

const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

// Current month and last month only — a plain days-of-readings count for
// each, for the summary card's Compliance History mini panel.
export async function getComplianceHistory(patientId: string): Promise<ComplianceMonth[]> {
  const now = new Date();
  const months: Array<{ year: number; month: number }> = [];
  for (let i = 0; i < 2; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 });
  }

  return Promise.all(
    months.map(async ({ year, month }) => {
      const daysOfReadings = await getDaysOfReadingsForMonth(patientId, year, month);
      return {
        year,
        month,
        monthLabel: `${MONTH_LABELS[month - 1]} ${year}`,
        daysOfReadings,
      };
    })
  );
}

export async function getMonitoringMinutesForMonth(
  patientId: string,
  year: number,
  month: number
): Promise<number> {
  const { totalSeconds } = await getMonthlyMonitoringTotals(patientId, year, month);
  return totalSeconds / 60;
}

export type BillingStatus = "billable" | "billed" | "non_billable";

export function billingStatusFor(eligibility: CptEligibility, markedBilledAt: Date | null): BillingStatus {
  const hasAnyEligibleCode =
    eligibility.code99453 ||
    eligibility.code99454 ||
    eligibility.code99457 ||
    eligibility.code99458 ||
    eligibility.code95251;
  if (!hasAnyEligibleCode) return "non_billable";
  return markedBilledAt ? "billed" : "billable";
}

export type BillingRow = {
  patientId: string;
  mrn: string;
  firstName: string;
  lastName: string;
  eligibility: CptEligibility;
  markedBilledAt: Date | null;
  status: BillingStatus;
};

// Org-wide billing roster for a given month — the Billing tab's main table.
export async function getBillingRosterForMonth(
  organizationId: string,
  year: number,
  month: number
): Promise<BillingRow[]> {
  const patients = await prisma.patient.findMany({
    where: { organizationId, active: true },
    select: { id: true, mrn: true, firstName: true, lastName: true, cpt99453CompletedAt: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const periodStatuses = await prisma.billingPeriodStatus.findMany({
    where: { patientId: { in: patients.map((p) => p.id) }, year, month },
    select: { patientId: true, markedBilledAt: true },
  });
  const markedBilledByPatient = new Map(periodStatuses.map((s) => [s.patientId, s.markedBilledAt]));

  return Promise.all(
    patients.map(async (patient) => {
      const eligibility = await getCptEligibilityForMonth(patient, year, month);
      const markedBilledAt = markedBilledByPatient.get(patient.id) ?? null;
      return {
        patientId: patient.id,
        mrn: patient.mrn,
        firstName: patient.firstName,
        lastName: patient.lastName,
        eligibility,
        markedBilledAt,
        status: billingStatusFor(eligibility, markedBilledAt),
      };
    })
  );
}

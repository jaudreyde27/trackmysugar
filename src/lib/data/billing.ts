import "server-only";
import { prisma } from "@/lib/db";
import { getMonthlyMonitoringTotals } from "@/lib/data/monitoring";

// RPM billing thresholds, as two mutually-exclusive tiers per group (a
// patient gets at most one code from each group in a given month):
//   - Device supply/data transmission: 99445 for 2–15 days of transmitted
//     data, 99454 for 16+ days.
//   - Treatment management: 99470 for 10–19 interactive minutes, 99457 for
//     20+. 99458 stacks as additional complete 20-minute blocks beyond the
//     first 20 (tied to 99457, never paired with 99470).
const CPT_99445_MIN_DAYS = 2;
const CPT_99445_MAX_DAYS = 15;
const CPT_99454_MIN_DAYS = 16;
const CPT_99470_MIN_MINUTES = 10;
const CPT_99470_MAX_MINUTES = 19;
const CPT_99457_MIN_MINUTES = 20;
const CPT_99458_MIN_MINUTES = 40;

// Approximate national-average non-facility Medicare rates, for
// illustrative dollar totals only — NOT a real fee schedule. Swap for the
// org's actual contracted rates before relying on this for real billing.
export const CPT_APPROX_RATES = {
  code99453: 19,
  code99445: 30,
  code99454: 50,
  code99470: 30,
  code99457: 50,
  code99458: 40,
} as const;

export function estimatedDollarsFor(eligibility: CptEligibility): number {
  let total = 0;
  if (eligibility.code99453) total += CPT_APPROX_RATES.code99453;
  if (eligibility.code99445) total += CPT_APPROX_RATES.code99445;
  if (eligibility.code99454) total += CPT_APPROX_RATES.code99454;
  if (eligibility.code99470) total += CPT_APPROX_RATES.code99470;
  if (eligibility.code99457) total += CPT_APPROX_RATES.code99457;
  if (eligibility.code99458) total += CPT_APPROX_RATES.code99458;
  return total;
}

export type CptEligibility = {
  code99453: boolean; // one-time setup/education checkoff
  code99453CompletedAt: Date | null;
  code99445: boolean; // 2–15 days of readings this month
  code99454: boolean; // 16+ days of readings this month
  code99470: boolean; // 10–19 interactive minutes
  code99457: boolean; // 20+ interactive minutes (first 20 min)
  code99458: boolean; // additional 20-minute block beyond 99457
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
  const [daysOfReadings, totals] = await Promise.all([
    getDaysOfReadingsForMonth(patient.id, year, month),
    getMonthlyMonitoringTotals(patient.id, year, month),
  ]);

  const monitoringMinutes = totals.totalSeconds / 60;
  const interactiveMinutes = totals.interactiveSeconds / 60;

  return {
    code99453: patient.cpt99453CompletedAt != null,
    code99453CompletedAt: patient.cpt99453CompletedAt,
    code99445: daysOfReadings >= CPT_99445_MIN_DAYS && daysOfReadings <= CPT_99445_MAX_DAYS,
    code99454: daysOfReadings >= CPT_99454_MIN_DAYS,
    code99470: interactiveMinutes >= CPT_99470_MIN_MINUTES && interactiveMinutes <= CPT_99470_MAX_MINUTES,
    code99457: interactiveMinutes >= CPT_99457_MIN_MINUTES,
    code99458: interactiveMinutes >= CPT_99458_MIN_MINUTES,
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

export type BillingStatus = "billed" | "unbilled";

// The six RPM CPT codes the billing dashboard is oriented around.
function hasAnyRpmCode(eligibility: CptEligibility): boolean {
  return (
    eligibility.code99453 ||
    eligibility.code99445 ||
    eligibility.code99454 ||
    eligibility.code99470 ||
    eligibility.code99457 ||
    eligibility.code99458
  );
}

export function billingStatusFor(markedBilledAt: Date | null): BillingStatus {
  return markedBilledAt ? "billed" : "unbilled";
}

export type BillingRow = {
  patientId: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  supervisingProviderName: string | null;
  eligibility: CptEligibility;
  markedBilledAt: Date | null;
  status: BillingStatus;
};

// Org-wide billing roster for a given month — the Billing tab's main table.
// Only patients billable on at least one of the six RPM codes this month
// are returned; the roster is a different set of patients every month.
export async function getBillingRosterForMonth(
  organizationId: string,
  year: number,
  month: number
): Promise<BillingRow[]> {
  const patients = await prisma.patient.findMany({
    where: { organizationId, active: true },
    select: {
      id: true,
      mrn: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      supervisingProviderName: true,
      cpt99453CompletedAt: true,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const periodStatuses = await prisma.billingPeriodStatus.findMany({
    where: { patientId: { in: patients.map((p) => p.id) }, year, month },
    select: { patientId: true, markedBilledAt: true },
  });
  const markedBilledByPatient = new Map(periodStatuses.map((s) => [s.patientId, s.markedBilledAt]));

  const rows = await Promise.all(
    patients.map(async (patient) => {
      const eligibility = await getCptEligibilityForMonth(patient, year, month);
      const markedBilledAt = markedBilledByPatient.get(patient.id) ?? null;
      return {
        patientId: patient.id,
        mrn: patient.mrn,
        firstName: patient.firstName,
        lastName: patient.lastName,
        dateOfBirth: patient.dateOfBirth,
        supervisingProviderName: patient.supervisingProviderName,
        eligibility,
        markedBilledAt,
        status: billingStatusFor(markedBilledAt),
      };
    })
  );

  return rows.filter((row) => hasAnyRpmCode(row.eligibility));
}

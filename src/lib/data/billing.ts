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

export type ComplianceTone = "compliant" | "in_progress" | "non_compliant";

export type ComplianceMonth = {
  year: number;
  month: number;
  monthLabel: string;
  statusLabel: string;
  daysOfReadings: number;
  tone: ComplianceTone;
};

export function complianceToneFor(daysOfReadings: number): { tone: ComplianceTone; label: string } {
  if (daysOfReadings >= CPT_99454_MIN_DAYS) return { tone: "compliant", label: "Very Compliant" };
  if (daysOfReadings > 0) return { tone: "in_progress", label: "In Progress" };
  return { tone: "non_compliant", label: "Non-compliant" };
}

const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

// Current month, last month, and two months ago — for the summary card's
// Compliance History mini panel.
export async function getComplianceHistory(patientId: string): Promise<ComplianceMonth[]> {
  const now = new Date();
  const months: Array<{ year: number; month: number }> = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 });
  }

  return Promise.all(
    months.map(async ({ year, month }) => {
      const daysOfReadings = await getDaysOfReadingsForMonth(patientId, year, month);
      const { tone, label: statusLabel } = complianceToneFor(daysOfReadings);
      return {
        year,
        month,
        monthLabel: `${MONTH_LABELS[month - 1]} ${year}`,
        statusLabel,
        daysOfReadings,
        tone,
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

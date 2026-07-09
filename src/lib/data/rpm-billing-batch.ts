import "server-only";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { getMonthlyMonitoringTotals } from "@/lib/data/monitoring";
import { getReimbursementRatesForOrg, type RpmCptCode } from "@/lib/data/reimbursement-rates";

// Mirrors src/lib/data/billing.ts's thresholds — 99445/99454 and
// 99470/99457 are mutually-exclusive tiers within their group. Time-based
// codes use total logged monitoring minutes (calls + notes), not just
// interactive-flagged time.
const CPT_99445_MIN_DAYS = 2;
const CPT_99445_MAX_DAYS = 15;
const CPT_99454_MIN_DAYS = 16;
const CPT_99470_MIN_MINUTES = 10;
const CPT_99470_MAX_MINUTES = 19;
const CPT_99457_MIN_MINUTES = 20;
const CPT_99458_INCREMENT_MINUTES = 20;

function periodBoundsFor(year: number, month: number): { periodStart: Date; periodEnd: Date } {
  const periodStart = new Date(Date.UTC(year, month - 1, 1));
  const periodEnd = new Date(Date.UTC(year, month, 1));
  return { periodStart, periodEnd };
}

async function getDaysOfReadingsForMonth(patientId: string, year: number, month: number): Promise<number> {
  const { periodStart, periodEnd } = periodBoundsFor(year, month);
  return prisma.syncDay.count({
    where: { patientId, date: { gte: periodStart, lt: periodEnd }, hasData: true },
  });
}

export type GenerateBatchResult = {
  batchId: string;
  lineCount: number;
  exclusionCount: number;
};

// Snapshots this period's RPM billing eligibility into persisted
// RpmBillingLine/RpmExclusion rows, distinct from the live tracker in
// src/lib/data/billing.ts which always recomputes on the fly. Regenerating
// a period replaces its lines/exclusions rather than creating a duplicate
// batch (enforced by BillingBatch's @@unique on org+period).
export async function generateMonthlyBatch(
  organizationId: string,
  year: number,
  month: number,
  generatedByStaffUserId: string | null
): Promise<GenerateBatchResult> {
  const { periodStart, periodEnd } = periodBoundsFor(year, month);

  const [organization, rates] = await Promise.all([
    prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { billingProviderName: true, billingProviderNpi: true, billingProviderTaxId: true },
    }),
    getReimbursementRatesForOrg(organizationId),
  ]);

  const patients = await prisma.patient.findMany({
    where: { organizationId, active: true },
    select: {
      id: true,
      primaryDiagnosisCode: true,
      supervisingProviderNpi: true,
      cpt99453CompletedAt: true,
      rpmSetupBilled: true,
    },
  });

  const batch = await prisma.billingBatch.upsert({
    where: { organizationId_periodStart_periodEnd: { organizationId, periodStart, periodEnd } },
    update: { generatedAt: new Date(), generatedByStaffUserId },
    create: { organizationId, periodStart, periodEnd, generatedByStaffUserId },
  });

  await prisma.rpmBillingLine.deleteMany({ where: { batchId: batch.id } });
  await prisma.rpmExclusion.deleteMany({ where: { organizationId, periodStart, periodEnd } });

  let lineCount = 0;
  let exclusionCount = 0;

  for (const patient of patients) {
    const [daysOfReadings, totals] = await Promise.all([
      getDaysOfReadingsForMonth(patient.id, year, month),
      getMonthlyMonitoringTotals(patient.id, year, month),
    ]);
    const monitoringMinutes = totals.totalSeconds / 60;

    const meets99453 = patient.cpt99453CompletedAt != null && !patient.rpmSetupBilled;
    const meets99445 = daysOfReadings >= CPT_99445_MIN_DAYS && daysOfReadings <= CPT_99445_MAX_DAYS;
    const meets99454 = daysOfReadings >= CPT_99454_MIN_DAYS;
    const meets99470 = monitoringMinutes >= CPT_99470_MIN_MINUTES && monitoringMinutes <= CPT_99470_MAX_MINUTES;
    const meets99457 = monitoringMinutes >= CPT_99457_MIN_MINUTES;
    const additional99458Units = meets99457
      ? Math.floor((monitoringMinutes - CPT_99457_MIN_MINUTES) / CPT_99458_INCREMENT_MINUTES)
      : 0;
    const meets99458 = additional99458Units >= 1;

    const baseLine = {
      patientId: patient.id,
      organizationId,
      batchId: batch.id,
      billingPeriodStart: periodStart,
      billingPeriodEnd: periodEnd,
      diagnosisCode: patient.primaryDiagnosisCode,
      renderingProviderNpi: patient.supervisingProviderNpi,
      billingProviderName: organization.billingProviderName,
      billingProviderNpi: organization.billingProviderNpi,
      billingProviderTaxId: organization.billingProviderTaxId,
    };

    const linesToCreate: Array<{ cptCode: string; units: number }> = [];
    if (meets99453) linesToCreate.push({ cptCode: "99453", units: 1 });
    if (meets99445) linesToCreate.push({ cptCode: "99445", units: 1 });
    if (meets99454) linesToCreate.push({ cptCode: "99454", units: 1 });
    if (meets99470) linesToCreate.push({ cptCode: "99470", units: 1 });
    if (meets99457) linesToCreate.push({ cptCode: "99457", units: 1 });
    if (meets99458) linesToCreate.push({ cptCode: "99458", units: additional99458Units });

    if (linesToCreate.length === 0) {
      const shortfalls: string[] = [];
      if (!meets99445 && !meets99454) shortfalls.push(`Transmission days: ${daysOfReadings}/${CPT_99445_MIN_DAYS} required`);
      if (!meets99470 && !meets99457) {
        shortfalls.push(`Monitoring time: ${monitoringMinutes.toFixed(0)}/${CPT_99470_MIN_MINUTES} min required`);
      }
      await prisma.rpmExclusion.create({
        data: {
          patientId: patient.id,
          organizationId,
          periodStart,
          periodEnd,
          reason: shortfalls.length > 0 ? shortfalls.join("; ") : "No qualifying RPM activity this period",
        },
      });
      exclusionCount++;
      continue;
    }

    await prisma.rpmBillingLine.createMany({
      data: linesToCreate.map((line) => ({
        ...baseLine,
        ...line,
        chargeAmount: rates[line.cptCode as RpmCptCode] * line.units,
      })),
    });
    lineCount += linesToCreate.length;

    if (meets99453) {
      await prisma.patient.update({ where: { id: patient.id }, data: { rpmSetupBilled: true } });
    }
  }

  await logAudit({
    staffUserId: generatedByStaffUserId,
    action: "RPM_BILLING_BATCH_GENERATED",
    metadata: { batchId: batch.id, organizationId, year, month, lineCount, exclusionCount },
  });

  return { batchId: batch.id, lineCount, exclusionCount };
}

export type BillingBatchSummary = {
  id: string;
  generatedAt: Date;
  generatedByStaffUserName: string | null;
  lineCount: number;
  exclusionCount: number;
};

export async function getBillingBatchForPeriod(
  organizationId: string,
  year: number,
  month: number
): Promise<BillingBatchSummary | null> {
  const { periodStart, periodEnd } = periodBoundsFor(year, month);

  const batch = await prisma.billingBatch.findUnique({
    where: { organizationId_periodStart_periodEnd: { organizationId, periodStart, periodEnd } },
    include: {
      generatedByStaffUser: { select: { name: true } },
      _count: { select: { lines: true } },
    },
  });
  if (!batch) return null;

  const exclusionCount = await prisma.rpmExclusion.count({
    where: { organizationId, periodStart, periodEnd },
  });

  return {
    id: batch.id,
    generatedAt: batch.generatedAt,
    generatedByStaffUserName: batch.generatedByStaffUser?.name ?? null,
    lineCount: batch._count.lines,
    exclusionCount,
  };
}

export type BillingBatchPeriod = {
  year: number;
  month: number;
};

// Every period this org has a generated batch for, newest first — drives
// the "download a previous month" dropdown (only periods with an actual
// batch are listable, since the export route 404s otherwise).
export async function listBillingBatchPeriods(organizationId: string): Promise<BillingBatchPeriod[]> {
  const batches = await prisma.billingBatch.findMany({
    where: { organizationId },
    select: { periodStart: true },
    orderBy: { periodStart: "desc" },
  });
  return batches.map((b) => ({
    year: b.periodStart.getUTCFullYear(),
    month: b.periodStart.getUTCMonth() + 1,
  }));
}

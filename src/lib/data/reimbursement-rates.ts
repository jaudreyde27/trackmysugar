import "server-only";
import { prisma } from "@/lib/db";

export const RPM_CPT_CODES = ["99453", "99445", "99454", "99470", "99457", "99458"] as const;
export type RpmCptCode = (typeof RPM_CPT_CODES)[number];

export const RPM_CPT_LABELS: Record<RpmCptCode, string> = {
  "99453": "RPM initial setup & patient education",
  "99445": "RPM device supply/data transmission (2-15 days)",
  "99454": "RPM device supply/data transmission (16+ days)",
  "99470": "RPM treatment management, first 10 min",
  "99457": "RPM treatment management, first 20 min",
  "99458": "RPM treatment management, each additional 20 min",
};

// Illustrative national-average figures, used only until the practice sets
// its own contracted rate for a code under Settings → Reimbursement Rates.
export const DEFAULT_RPM_RATES: Record<RpmCptCode, number> = {
  "99453": 19,
  "99445": 30,
  "99454": 50,
  "99470": 30,
  "99457": 50,
  "99458": 40,
};

export type RpmRateMap = Record<RpmCptCode, number>;

export async function getReimbursementRatesForOrg(organizationId: string): Promise<RpmRateMap> {
  const rows = await prisma.reimbursementRate.findMany({
    where: { organizationId },
    select: { cptCode: true, rate: true },
  });
  const configured = new Map(rows.map((r) => [r.cptCode, Number(r.rate)]));
  const result = {} as RpmRateMap;
  for (const code of RPM_CPT_CODES) {
    result[code] = configured.get(code) ?? DEFAULT_RPM_RATES[code];
  }
  return result;
}

export type ReimbursementRateRow = {
  cptCode: RpmCptCode;
  label: string;
  rate: number;
  isDefault: boolean;
};

// Settings page view — same rates as above, but flags which codes are
// still on the illustrative default so the table can call that out.
export async function getReimbursementRateRowsForOrg(organizationId: string): Promise<ReimbursementRateRow[]> {
  const rows = await prisma.reimbursementRate.findMany({
    where: { organizationId },
    select: { cptCode: true, rate: true },
  });
  const configured = new Map(rows.map((r) => [r.cptCode, Number(r.rate)]));
  return RPM_CPT_CODES.map((code) => ({
    cptCode: code,
    label: RPM_CPT_LABELS[code],
    rate: configured.get(code) ?? DEFAULT_RPM_RATES[code],
    isDefault: !configured.has(code),
  }));
}

export async function upsertReimbursementRate(
  organizationId: string,
  cptCode: string,
  rate: number
): Promise<void> {
  await prisma.reimbursementRate.upsert({
    where: { organizationId_cptCode: { organizationId, cptCode } },
    update: { rate },
    create: { organizationId, cptCode, rate },
  });
}

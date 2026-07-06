import "server-only";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

// Standard CGM ranges (mg/dL) per ADA/AACE consensus reporting.
export const RANGE_VERY_LOW = 54;
export const RANGE_LOW = 70;
export const RANGE_HIGH = 180;
export const RANGE_VERY_HIGH = 250;

export type GlucoseStats = {
  patientId: string;
  readingCount: number;
  averageGlucose: number | null;
  gmi: number | null;
  percentVeryLow: number;
  percentLow: number;
  percentInRange: number;
  percentHigh: number;
  percentVeryHigh: number;
};

type RawStatsRow = {
  patientId: string;
  total: bigint;
  avgValue: number | null;
  veryLow: bigint;
  low: bigint;
  inRange: bigint;
  high: bigint;
  veryHigh: bigint;
};

function toStats(row: RawStatsRow): GlucoseStats {
  const total = Number(row.total);
  const pct = (n: bigint) => (total > 0 ? (Number(n) / total) * 100 : 0);
  const avg = row.avgValue;

  return {
    patientId: row.patientId,
    readingCount: total,
    averageGlucose: avg,
    // GMI (Glucose Management Indicator), ADA formula for mg/dL.
    gmi: avg != null ? 3.31 + 0.02392 * avg : null,
    percentVeryLow: pct(row.veryLow),
    percentLow: pct(row.low),
    percentInRange: pct(row.inRange),
    percentHigh: pct(row.high),
    percentVeryHigh: pct(row.veryHigh),
  };
}

// One aggregate query for every patient's stats over the trailing window,
// rather than N+1 per-patient queries.
export async function getGlucoseStatsForAllPatients(days: number): Promise<Map<string, GlucoseStats>> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await prisma.$queryRaw<RawStatsRow[]>(Prisma.sql`
    SELECT
      "patientId" AS "patientId",
      COUNT(*) AS total,
      AVG(value)::float AS "avgValue",
      SUM(CASE WHEN value < ${RANGE_VERY_LOW} THEN 1 ELSE 0 END) AS "veryLow",
      SUM(CASE WHEN value >= ${RANGE_VERY_LOW} AND value < ${RANGE_LOW} THEN 1 ELSE 0 END) AS low,
      SUM(CASE WHEN value >= ${RANGE_LOW} AND value <= ${RANGE_HIGH} THEN 1 ELSE 0 END) AS "inRange",
      SUM(CASE WHEN value > ${RANGE_HIGH} AND value <= ${RANGE_VERY_HIGH} THEN 1 ELSE 0 END) AS high,
      SUM(CASE WHEN value > ${RANGE_VERY_HIGH} THEN 1 ELSE 0 END) AS "veryHigh"
    FROM "glucose_readings"
    WHERE "displayTime" >= ${since}
    GROUP BY "patientId"
  `);

  return new Map(rows.map((row) => [row.patientId, toStats(row)]));
}

const EMPTY_STATS_TEMPLATE = {
  readingCount: 0,
  averageGlucose: null,
  gmi: null,
  percentVeryLow: 0,
  percentLow: 0,
  percentInRange: 0,
  percentHigh: 0,
  percentVeryHigh: 0,
} as const;

export async function getGlucoseStatsForPatient(
  patientId: string,
  days: number
): Promise<GlucoseStats> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await prisma.$queryRaw<RawStatsRow[]>(Prisma.sql`
    SELECT
      "patientId" AS "patientId",
      COUNT(*) AS total,
      AVG(value)::float AS "avgValue",
      SUM(CASE WHEN value < ${RANGE_VERY_LOW} THEN 1 ELSE 0 END) AS "veryLow",
      SUM(CASE WHEN value >= ${RANGE_VERY_LOW} AND value < ${RANGE_LOW} THEN 1 ELSE 0 END) AS low,
      SUM(CASE WHEN value >= ${RANGE_LOW} AND value <= ${RANGE_HIGH} THEN 1 ELSE 0 END) AS "inRange",
      SUM(CASE WHEN value > ${RANGE_HIGH} AND value <= ${RANGE_VERY_HIGH} THEN 1 ELSE 0 END) AS high,
      SUM(CASE WHEN value > ${RANGE_VERY_HIGH} THEN 1 ELSE 0 END) AS "veryHigh"
    FROM "glucose_readings"
    WHERE "displayTime" >= ${since} AND "patientId" = ${patientId}
    GROUP BY "patientId"
  `);

  return rows[0] ? toStats(rows[0]) : { patientId, ...EMPTY_STATS_TEMPLATE };
}

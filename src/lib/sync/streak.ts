import { prisma } from "@/lib/db";

export const R30_WINDOW_DAYS = 30;

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function yesterdayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
}

// Counts consecutive calendar days (walking backward from yesterday, the
// most recent day that can be "complete") with successfully transmitted
// data. A missing or failed day breaks the streak.
export async function computeCurrentStreak(patientId: string): Promise<number> {
  const days = await prisma.syncDay.findMany({
    where: { patientId },
    orderBy: { date: "desc" },
    take: 400,
    select: { date: true, hasData: true },
  });

  const byDate = new Map(days.map((d) => [toDateKey(d.date), d.hasData]));

  let streak = 0;
  const cursor = yesterdayUtc();

  for (;;) {
    const key = toDateKey(cursor);
    const hasData = byDate.get(key);
    if (hasData !== true) break;
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}

function r30WindowStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - R30_WINDOW_DAYS));
}

// "R30": how many of the last 30 calendar days had data successfully
// transmitted — not necessarily consecutive (unlike the streak above).
// Mirrors the >=16-of-30-day threshold common in CGM remote-monitoring
// billing, so it's shown independently of the consecutive-day streak.
export async function getR30CountsForAllPatients(): Promise<Map<string, number>> {
  const rows = await prisma.syncDay.groupBy({
    by: ["patientId"],
    where: { date: { gte: r30WindowStart() }, hasData: true },
    _count: { _all: true },
  });

  return new Map(rows.map((r) => [r.patientId, r._count._all]));
}

export async function getR30Count(patientId: string): Promise<number> {
  return prisma.syncDay.count({
    where: { patientId, date: { gte: r30WindowStart() }, hasData: true },
  });
}

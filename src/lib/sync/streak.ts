import { prisma } from "@/lib/db";

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

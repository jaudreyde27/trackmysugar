import "server-only";
import { prisma } from "@/lib/db";
import type { CdcesCallSession } from "@/generated/prisma/client";

// The "last touchpoint" date is whichever is more recent: the end of the
// last completed call, or the start of a call still in progress. Two
// separate MAX aggregates (rather than a per-row coalesce) are equivalent
// here since a session's startedAt never exceeds its own endedAt.
export async function getLastTouchpointForAllPatients(): Promise<Map<string, Date>> {
  const rows = await prisma.cdcesCallSession.groupBy({
    by: ["patientId"],
    _max: { startedAt: true, endedAt: true },
  });

  const result = new Map<string, Date>();
  for (const row of rows) {
    const started = row._max.startedAt;
    const ended = row._max.endedAt;
    const latest = ended && ended > started! ? ended : started;
    if (latest) result.set(row.patientId, latest);
  }
  return result;
}

export async function getLastTouchpointForPatient(patientId: string): Promise<Date | null> {
  const [lastEnded, lastStarted] = await Promise.all([
    prisma.cdcesCallSession.findFirst({
      where: { patientId, endedAt: { not: null } },
      orderBy: { endedAt: "desc" },
      select: { endedAt: true },
    }),
    prisma.cdcesCallSession.findFirst({
      where: { patientId },
      orderBy: { startedAt: "desc" },
      select: { startedAt: true },
    }),
  ]);

  const ended = lastEnded?.endedAt ?? null;
  const started = lastStarted?.startedAt ?? null;
  if (ended && started) return ended > started ? ended : started;
  return ended ?? started;
}

export function getActiveCallSession(patientId: string): Promise<CdcesCallSession | null> {
  return prisma.cdcesCallSession.findFirst({
    where: { patientId, endedAt: null },
    orderBy: { startedAt: "desc" },
  });
}

export function getRecentCallSessions(patientId: string, limit = 5): Promise<CdcesCallSession[]> {
  return prisma.cdcesCallSession.findMany({
    where: { patientId },
    orderBy: { startedAt: "desc" },
    take: limit,
  });
}

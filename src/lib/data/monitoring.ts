import "server-only";
import { prisma } from "@/lib/db";
import type { MonitoringSession } from "@prisma/client";

export type MonitoringSessionWithStaff = MonitoringSession & {
  staffUser: { name: string };
};

// The "last touchpoint" date is whichever is more recent: the end of the
// last completed call, or the start of a call still in progress. Two
// separate MAX aggregates (rather than a per-row coalesce) are equivalent
// here since a session's startedAt never exceeds its own endedAt.
export async function getLastTouchpointForAllPatients(): Promise<Map<string, Date>> {
  const rows = await prisma.monitoringSession.groupBy({
    by: ["patientId"],
    _max: { occurredAt: true },
  });

  const result = new Map<string, Date>();
  for (const row of rows) {
    if (row._max.occurredAt) result.set(row.patientId, row._max.occurredAt);
  }
  return result;
}

export async function getLastTouchpointForPatient(patientId: string): Promise<Date | null> {
  const last = await prisma.monitoringSession.findFirst({
    where: { patientId },
    orderBy: { occurredAt: "desc" },
    select: { occurredAt: true },
  });
  return last?.occurredAt ?? null;
}

export function getActiveCallSession(patientId: string): Promise<MonitoringSession | null> {
  return prisma.monitoringSession.findFirst({
    where: { patientId, source: "CALL", endedAt: null },
    orderBy: { startedAt: "desc" },
  });
}

// Every loggable touchpoint (call, note, or manual entry) — the note
// history feed on the Readings tab shows all of these, newest first.
export function getRecentMonitoringSessions(
  patientId: string,
  limit = 100
): Promise<MonitoringSessionWithStaff[]> {
  return prisma.monitoringSession.findMany({
    where: { patientId },
    orderBy: { occurredAt: "desc" },
    take: limit,
    include: { staffUser: { select: { name: true } } },
  });
}

export function getMonitoringSessionsForMonth(
  patientId: string,
  year: number,
  month: number
): Promise<MonitoringSessionWithStaff[]> {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return prisma.monitoringSession.findMany({
    where: { patientId, occurredAt: { gte: start, lt: end } },
    orderBy: { occurredAt: "desc" },
    include: { staffUser: { select: { name: true } } },
  });
}

export type MonthlyMonitoringTotals = {
  totalSeconds: number;
  interactiveSeconds: number;
};

// interactiveSeconds counts toward 99457/99458 (RPM treatment management
// WITH interactive communication) — a CALL is inherently interactive; a
// NOTE/MANUAL entry only counts if the two-way-communication toggle was set.
export async function getMonthlyMonitoringTotals(
  patientId: string,
  year: number,
  month: number
): Promise<MonthlyMonitoringTotals> {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  const rows = await prisma.monitoringSession.findMany({
    where: { patientId, occurredAt: { gte: start, lt: end } },
    select: { durationSeconds: true, source: true, twoWayCommunication: true },
  });

  let totalSeconds = 0;
  let interactiveSeconds = 0;
  for (const row of rows) {
    totalSeconds += row.durationSeconds;
    if (row.source === "CALL" || row.twoWayCommunication) {
      interactiveSeconds += row.durationSeconds;
    }
  }
  return { totalSeconds, interactiveSeconds };
}

// Whether a qualifying CGM interpretation was documented this month — the
// "Chart Review" quick-note template is the closest machine-checkable proxy
// to a CGM analysis actually being performed and recorded.
export async function hasCgmInterpretationForMonth(
  patientId: string,
  year: number,
  month: number
): Promise<boolean> {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  const row = await prisma.monitoringSession.findFirst({
    where: { patientId, occurredAt: { gte: start, lt: end }, templateUsed: { contains: "Chart Review" } },
    select: { id: true },
  });
  return row != null;
}

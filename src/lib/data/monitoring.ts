import "server-only";
import { prisma } from "@/lib/db";
import type { MonitoringSession } from "@prisma/client";

export type MonitoringSessionWithStaff = MonitoringSession & {
  staffUser: { name: string };
};

// A "touchpoint"/visit is a live call, or a note explicitly tagged
// "RPM Completed" — the other quick-note templates (Left Voicemail,
// Unable to Leave Voicemail, Chart Comment) are notes only: they still
// show up in the patient's note history, but a missed-call attempt or a
// chart-review comment doesn't count as having reached the patient.
const TOUCHPOINT_WHERE = {
  OR: [{ source: "CALL" as const }, { templateUsed: { contains: "RPM Completed" } }],
};

export async function getLastTouchpointForAllPatients(): Promise<Map<string, Date>> {
  const rows = await prisma.monitoringSession.groupBy({
    by: ["patientId"],
    where: TOUCHPOINT_WHERE,
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
    where: { patientId, ...TOUCHPOINT_WHERE },
    orderBy: { occurredAt: "desc" },
    select: { occurredAt: true },
  });
  return last?.occurredAt ?? null;
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
};

// totalSeconds counts ALL logged monitoring time this month — calls and
// notes alike — toward 99470/99457/99458 (RPM treatment management is
// billed on total time spent monitoring the patient, not just
// interactive-flagged entries).
export async function getMonthlyMonitoringTotals(
  patientId: string,
  year: number,
  month: number
): Promise<MonthlyMonitoringTotals> {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  const rows = await prisma.monitoringSession.findMany({
    where: { patientId, occurredAt: { gte: start, lt: end } },
    select: { durationSeconds: true },
  });

  let totalSeconds = 0;
  for (const row of rows) {
    totalSeconds += row.durationSeconds;
  }
  return { totalSeconds };
}

// Whether a qualifying CGM interpretation was documented this month — the
// "Chart Comment" quick-note template is the closest machine-checkable proxy
// to a CGM analysis actually being performed and recorded.
export async function hasCgmInterpretationForMonth(
  patientId: string,
  year: number,
  month: number
): Promise<boolean> {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  const row = await prisma.monitoringSession.findFirst({
    where: { patientId, occurredAt: { gte: start, lt: end }, templateUsed: { contains: "Chart Comment" } },
    select: { id: true },
  });
  return row != null;
}

import "server-only";
import { prisma } from "@/lib/db";

export type StaffPerformanceRow = {
  staffUserId: string;
  name: string;
  active: boolean;
  monitoringMinutes: number;
  uniquePatients: number;
  avgMinutesPerPatient: number;
  avgNotesPerPatient: number;
};

export type StaffPerformanceSummary = {
  totalStaff: number;
  activeStaff: number;
  totalMonitoringMinutes: number;
  twoWayCommunications: number;
  rows: StaffPerformanceRow[];
};

// Platform-admin scoped: covers every clinic's staff ("All Accounts"), not
// just one org — today there's only one seeded org, but this doesn't need
// to change when a second one exists.
export async function getStaffPerformanceForMonth(year: number, month: number): Promise<StaffPerformanceSummary> {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  const staff = await prisma.staffUser.findMany({
    where: { isPlatformAdmin: false },
    select: { id: true, name: true, active: true },
    orderBy: { name: "asc" },
  });

  const sessions = await prisma.monitoringSession.findMany({
    where: { occurredAt: { gte: start, lt: end }, staffUserId: { in: staff.map((s) => s.id) } },
    select: { staffUserId: true, patientId: true, durationSeconds: true, notes: true, source: true, twoWayCommunication: true },
  });

  const byStaff = new Map<string, { seconds: number; patients: Set<string>; notesCount: number }>();
  let twoWayCommunications = 0;

  for (const s of sessions) {
    if (!byStaff.has(s.staffUserId)) {
      byStaff.set(s.staffUserId, { seconds: 0, patients: new Set(), notesCount: 0 });
    }
    const agg = byStaff.get(s.staffUserId)!;
    agg.seconds += s.durationSeconds;
    agg.patients.add(s.patientId);
    if (s.notes.trim().length > 0) agg.notesCount += 1;
    if (s.source === "CALL" || s.twoWayCommunication) twoWayCommunications += 1;
  }

  const rows: StaffPerformanceRow[] = staff.map((s) => {
    const agg = byStaff.get(s.id) ?? { seconds: 0, patients: new Set<string>(), notesCount: 0 };
    const minutes = agg.seconds / 60;
    const uniquePatients = agg.patients.size;
    return {
      staffUserId: s.id,
      name: s.name,
      active: s.active,
      monitoringMinutes: minutes,
      uniquePatients,
      avgMinutesPerPatient: uniquePatients > 0 ? minutes / uniquePatients : 0,
      avgNotesPerPatient: uniquePatients > 0 ? agg.notesCount / uniquePatients : 0,
    };
  });

  return {
    totalStaff: staff.length,
    activeStaff: staff.filter((s) => s.active).length,
    totalMonitoringMinutes: rows.reduce((sum, r) => sum + r.monitoringMinutes, 0),
    twoWayCommunications,
    rows,
  };
}

export type StaffTrendPoint = { year: number; month: number; monthLabel: string; monitoringMinutes: number };

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

export async function getStaffTrend(staffUserId: string, monthsBack = 6): Promise<StaffTrendPoint[]> {
  const now = new Date();
  const months: Array<{ year: number; month: number }> = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 });
  }

  return Promise.all(
    months.map(async ({ year, month }) => {
      const start = new Date(Date.UTC(year, month - 1, 1));
      const end = new Date(Date.UTC(year, month, 1));
      const agg = await prisma.monitoringSession.aggregate({
        where: { staffUserId, occurredAt: { gte: start, lt: end } },
        _sum: { durationSeconds: true },
      });
      return {
        year,
        month,
        monthLabel: `${MONTH_LABELS[month - 1]} ${year}`,
        monitoringMinutes: (agg._sum.durationSeconds ?? 0) / 60,
      };
    })
  );
}

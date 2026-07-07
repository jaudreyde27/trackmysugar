import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/auth/dal";
import { getStaffTrend } from "@/lib/data/staff-performance";
import { prisma } from "@/lib/db";
import { TopNav } from "@/components/top-nav";

function formatMinutes(minutes: number): string {
  const total = Math.round(minutes * 60);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return `${h}:${m.toString().padStart(2, "0")}`;
}

export default async function StaffTrendsPage({
  params,
}: {
  params: Promise<{ staffId: string }>;
}) {
  const session = await requirePlatformAdmin();
  const { staffId } = await params;

  const staff = await prisma.staffUser.findUnique({ where: { id: staffId }, select: { name: true } });
  if (!staff) notFound();

  const trend = await getStaffTrend(staffId, 6);
  const max = Math.max(1, ...trend.map((t) => t.monitoringMinutes));

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav staffName={session.staffUser.name} isPlatformAdmin />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <Link href="/admin" className="text-sm text-neutral-500 hover:underline dark:text-neutral-400">
          ← Overview reports
        </Link>
        <h1 className="mt-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          {staff.name} — Monitoring time trend
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Last 6 months</p>

        <div className="mt-6 space-y-2">
          {trend.map((point) => (
            <div key={`${point.year}-${point.month}`} className="flex items-center gap-3">
              <div className="w-16 text-xs text-neutral-600 dark:text-neutral-400">{point.monthLabel}</div>
              <div className="h-5 flex-1 rounded-sm bg-neutral-100 dark:bg-neutral-800">
                <div
                  className="h-5 rounded-sm bg-blue-500"
                  style={{ width: `${Math.max(2, (point.monitoringMinutes / max) * 100)}%` }}
                />
              </div>
              <div className="w-16 text-right text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                {formatMinutes(point.monitoringMinutes)}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

import { requirePlatformAdmin } from "@/lib/auth/dal";
import { TopNav } from "@/components/top-nav";
import { AdminSidebar } from "@/components/admin-sidebar";
import { StaffPerformanceView } from "@/components/staff-performance-view";
import { getStaffPerformanceForMonth } from "@/lib/data/staff-performance";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatMinutes(minutes: number): string {
  const total = Math.round(minutes * 60);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return `${h}:${m.toString().padStart(2, "0")}`;
}

export default async function AdminOverviewReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const session = await requirePlatformAdmin();

  const now = new Date();
  const { year: yearParam, month: monthParam } = await searchParams;
  const year = Number(yearParam) || now.getFullYear();
  const month = Number(monthParam) || now.getMonth() + 1;

  const summary = await getStaffPerformanceForMonth(year, month);
  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  const yearOptions = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav staffName={session.staffUser.name} isPlatformAdmin />
      <main className="mx-auto flex w-full max-w-[1400px] flex-1 gap-6 px-6 py-8">
        <AdminSidebar active="Overview Reports" orgName="All Accounts" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Activity By Staff Member
          </h1>

          <form method="get" className="mt-3 flex flex-wrap items-center gap-2">
            <select
              disabled
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-400"
            >
              <option>Activity By Staff Member</option>
            </select>
            <select
              disabled
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-400"
            >
              <option>All Accounts</option>
            </select>
            <select
              name="month"
              defaultValue={month}
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
            >
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {MONTH_NAMES[m - 1]}
                </option>
              ))}
            </select>
            <select
              name="year"
              defaultValue={year}
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Go
            </button>
          </form>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
              <div className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                General information
              </div>
              <div className="mt-2 grid grid-cols-3 gap-3">
                <div>
                  <div className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                    {summary.totalStaff}
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">Total staff</div>
                </div>
                <div>
                  <div className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                    {summary.activeStaff}
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">Active staff</div>
                </div>
                <div>
                  <div className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                    {formatMinutes(summary.totalMonitoringMinutes)}
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">Monitoring time</div>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
              <div className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Communications
              </div>
              <div className="mt-2">
                <div className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                  {summary.twoWayCommunications}
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">Two-way communications</div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <StaffPerformanceView rows={summary.rows} year={year} month={month} />
          </div>
        </div>
      </main>
    </div>
  );
}

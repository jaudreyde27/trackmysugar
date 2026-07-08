import Link from "next/link";
import { notFound } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { getBillingRosterForMonth, estimatedDollarsFor } from "@/lib/data/billing";
import { TopNav } from "@/components/top-nav";
import { BillingTable } from "@/components/billing-table";
import { PrintButton } from "@/components/print-button";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const session = await verifySession();
  if (!session.staffUser.organizationId) notFound();

  const now = new Date();
  const { year: yearParam, month: monthParam } = await searchParams;
  const year = Number(yearParam) || now.getFullYear();
  const month = Number(monthParam) || now.getMonth() + 1;

  const rows = await getBillingRosterForMonth(session.staffUser.organizationId, year, month);

  const billedThisMonth = rows
    .filter((r) => r.status === "billed")
    .reduce((sum, r) => sum + estimatedDollarsFor(r.eligibility), 0);
  const totalBillable = rows
    .filter((r) => r.status === "billable" || r.status === "billed")
    .reduce((sum, r) => sum + estimatedDollarsFor(r.eligibility), 0);

  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  const yearOptions = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav
        staffName={session.staffUser.name}
        isPlatformAdmin={session.staffUser.isPlatformAdmin}
        hasOrganization={!!session.staffUser.organizationId}
        portalType={session.staffUser.portalType}
        accessibleOrganizations={session.accessibleOrganizations}
        currentOrganizationId={session.staffUser.organizationId}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <Link href="/" className="text-sm text-neutral-500 hover:underline dark:text-neutral-400">
          ← Practice overview
        </Link>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            RPM Billing ({rows.length})
          </h1>
          <div className="flex items-center gap-2">
            <form method="get" className="flex items-center gap-2">
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
            <PrintButton />
            <a
              href={`/api/billing/export-pdf?year=${year}&month=${month}`}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              ↓ PDF
            </a>
            <a
              href={`/api/billing/export?year=${year}&month=${month}`}
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-contrast hover:bg-accent-hover"
            >
              ↓ CSV
            </a>
            <button
              type="button"
              disabled
              title="Settings coming soon"
              className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm text-neutral-400 dark:border-neutral-700"
            >
              ⚙
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-4">
          <div className="rounded-lg border border-neutral-200 px-4 py-3 dark:border-neutral-800">
            <div className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Billed this month
            </div>
            <div className="mt-0.5 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
              ${billedThisMonth.toFixed(0)}
            </div>
          </div>
          <div className="rounded-lg border border-neutral-200 px-4 py-3 dark:border-neutral-800">
            <div className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Total billable
            </div>
            <div className="mt-0.5 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
              ${totalBillable.toFixed(0)}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <BillingTable rows={rows} year={year} month={month} />
        </div>
      </main>
    </div>
  );
}

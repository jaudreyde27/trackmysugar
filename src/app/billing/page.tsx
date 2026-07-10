import Link from "next/link";
import { notFound } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { getBillingRosterForMonth, estimatedDollarsFor } from "@/lib/data/billing";
import { getReimbursementRatesForOrg } from "@/lib/data/reimbursement-rates";
import { AppShell } from "@/components/app-shell";
import { BillingTable } from "@/components/billing-table";
import { BillingPeriodSelector } from "@/components/billing-period-selector";
import { PrintButton } from "@/components/print-button";

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

  const [rows, rates] = await Promise.all([
    getBillingRosterForMonth(session.staffUser.organizationId, year, month),
    getReimbursementRatesForOrg(session.staffUser.organizationId),
  ]);

  const totalBillable = rows.reduce((sum, r) => sum + estimatedDollarsFor(r.eligibility, rates), 0);

  const yearOptions = Array.from(
    new Set([now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1, year])
  ).sort((a, b) => a - b);

  return (
    <AppShell session={session}>
      <main className="mx-auto w-full max-w-[1800px] flex-1 px-4 py-8">
        <Link href="/" className="text-sm text-neutral-500 hover:underline dark:text-neutral-400">
          ← Practice overview
        </Link>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">RPM Billing</h1>
          <div className="flex items-center gap-2">
            <BillingPeriodSelector year={year} month={month} yearOptions={yearOptions} />
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
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-4">
          <div className="rounded-lg border border-neutral-200 px-4 py-3 dark:border-neutral-800">
            <div className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Total Billable This Period
            </div>
            <div className="mt-0.5 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
              ${totalBillable.toFixed(0)}
            </div>
          </div>
          <div className="rounded-lg border border-neutral-200 px-4 py-3 dark:border-neutral-800">
            <div className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Total Patients This Period
            </div>
            <div className="mt-0.5 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
              {rows.length}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <BillingTable rows={rows} year={year} month={month} />
        </div>
      </main>
    </AppShell>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { getBillingRosterForMonth, estimatedDollarsFor } from "@/lib/data/billing";
import { getBillingBatchForPeriod, listBillingBatchPeriods } from "@/lib/data/rpm-billing-batch";
import { generateMonthlyBatch } from "@/app/actions/rpm-billing-batch";
import { TopNav } from "@/components/top-nav";
import { BillingTable } from "@/components/billing-table";
import { BillingPeriodSelector } from "@/components/billing-period-selector";
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
  const rpmBatch = await getBillingBatchForPeriod(session.staffUser.organizationId, year, month);
  const rpmBatchPeriods = await listBillingBatchPeriods(session.staffUser.organizationId);
  const boundGenerateMonthlyBatch = generateMonthlyBatch.bind(null, year, month);

  const billedThisMonth = rows
    .filter((r) => r.status === "billed")
    .reduce((sum, r) => sum + estimatedDollarsFor(r.eligibility), 0);
  const totalBillable = rows.reduce((sum, r) => sum + estimatedDollarsFor(r.eligibility), 0);

  const yearOptions = Array.from(
    new Set([now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1, year])
  ).sort((a, b) => a - b);

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

        <div className="mt-6 rounded-lg border border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            Monthly RPM billing batch
          </h2>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            A persisted CMS-1500-ready snapshot for {MONTH_NAMES[month - 1]} {year}, separate from the live
            eligibility roster below — generate it once billing is ready to submit for this period.
          </p>

          {rpmBatch ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Generated {rpmBatch.generatedAt.toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                {rpmBatch.generatedByStaffUserName ? ` by ${rpmBatch.generatedByStaffUserName}` : ""} ·{" "}
                {rpmBatch.lineCount} lines · {rpmBatch.exclusionCount} exclusions
              </p>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/billing/rpm-batch-export?year=${year}&month=${month}`}
                  className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-contrast hover:bg-accent-hover"
                >
                  ↓ CMS-1500 CSV
                </a>
                <form action={boundGenerateMonthlyBatch}>
                  <button
                    type="submit"
                    className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    Regenerate
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <form action={boundGenerateMonthlyBatch} className="mt-3">
              <button
                type="submit"
                className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-contrast hover:bg-accent-hover"
              >
                Generate Monthly Batch
              </button>
            </form>
          )}

          {rpmBatchPeriods.length > 0 && (
            <form
              action="/api/billing/rpm-batch-export"
              className="mt-3 flex flex-wrap items-center gap-2 border-t border-neutral-200 pt-3 dark:border-neutral-800"
            >
              <label className="text-xs text-neutral-500 dark:text-neutral-400" htmlFor="rpm-batch-period">
                Download a generated batch
              </label>
              <select
                id="rpm-batch-period"
                name="period"
                defaultValue={`${year}-${String(month).padStart(2, "0")}`}
                className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
              >
                {rpmBatchPeriods.map((p) => (
                  <option key={`${p.year}-${p.month}`} value={`${p.year}-${String(p.month).padStart(2, "0")}`}>
                    {MONTH_NAMES[p.month - 1]} {p.year}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Download CSV
              </button>
            </form>
          )}
        </div>

        <div className="mt-6">
          <BillingTable rows={rows} year={year} month={month} />
        </div>
      </main>
    </div>
  );
}

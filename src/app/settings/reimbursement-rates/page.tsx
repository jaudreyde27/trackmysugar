import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { getReimbursementRateRowsForOrg } from "@/lib/data/reimbursement-rates";
import { saveReimbursementRates } from "@/app/actions/reimbursement-rates";
import { AppShell } from "@/components/app-shell";
import { SettingsSidebar } from "@/components/settings-sidebar";

export default async function ReimbursementRatesPage() {
  const session = await requireAdmin();
  if (!session.staffUser.organizationId) notFound();

  const rateRows = await getReimbursementRateRowsForOrg(session.staffUser.organizationId);

  return (
    <AppShell session={session}>
      <main className="mx-auto flex w-full max-w-4xl flex-1 gap-6 px-6 py-8">
        <SettingsSidebar active="Reimbursement Rates" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Reimbursement Rates</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Your practice&apos;s contracted rate per RPM CPT code. These drive the dollar totals on the Billing tab
            and the Charges column on the exported CSV.
          </p>

          <form
            action={saveReimbursementRates}
            className="mt-4 rounded-lg border border-neutral-200 dark:border-neutral-800"
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                  <th className="px-4 py-2">CPT Code</th>
                  <th className="px-4 py-2">Description</th>
                  <th className="px-4 py-2">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
                {rateRows.map((row) => (
                  <tr key={row.cptCode}>
                    <td className="px-4 py-2 font-medium text-neutral-800 dark:text-neutral-200">{row.cptCode}</td>
                    <td className="px-4 py-2 text-neutral-600 dark:text-neutral-400">{row.label}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-neutral-400">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          name={`rate_${row.cptCode}`}
                          defaultValue={row.rate}
                          className="w-24 rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-950"
                        />
                        {row.isDefault && (
                          <span className="text-[10px] uppercase tracking-wide text-neutral-400">
                            Default — not yet configured
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-neutral-200 px-4 py-3 dark:border-neutral-800">
              <button
                type="submit"
                className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-contrast hover:bg-accent-hover"
              >
                Save Rates
              </button>
            </div>
          </form>
        </div>
      </main>
    </AppShell>
  );
}

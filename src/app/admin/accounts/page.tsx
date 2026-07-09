import { requirePlatformAdmin } from "@/lib/auth/dal";
import { AppShell } from "@/components/app-shell";
import { AdminSidebar } from "@/components/admin-sidebar";

export default async function AdminAccountsPage() {
  const session = await requirePlatformAdmin();

  return (
    <AppShell session={session}>
      <main className="mx-auto flex w-full max-w-[1400px] flex-1 gap-6 px-6 py-8">
        <AdminSidebar active="Accounts Overview" orgName="All Accounts" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Accounts Overview</h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Cross-org account management isn&apos;t built yet — today there&apos;s a single seeded
            organization.
          </p>
        </div>
      </main>
    </AppShell>
  );
}

import { requirePlatformAdmin } from "@/lib/auth/dal";
import { TopNav } from "@/components/top-nav";
import { AdminSidebar } from "@/components/admin-sidebar";

export default async function AdminAccountsPage() {
  const session = await requirePlatformAdmin();

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav staffName={session.staffUser.name} isPlatformAdmin />
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
    </div>
  );
}

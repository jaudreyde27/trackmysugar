import { verifySession } from "@/lib/auth/dal";
import { AppShell } from "@/components/app-shell";

export default async function ReportsPage() {
  const session = await verifySession();

  return (
    <AppShell session={session}>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Reports</h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">Coming soon.</p>
      </main>
    </AppShell>
  );
}

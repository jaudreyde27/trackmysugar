import { requirePlatformAdmin } from "@/lib/auth/dal";
import { TopNav } from "@/components/top-nav";

// Placeholder landing spot for the platform-admin area (org accounts,
// staff performance reporting, etc. — spec section 8). Real content lands
// in a later step; this exists now so the gate and nav link have somewhere
// to go.
export default async function AdminPage() {
  const session = await requirePlatformAdmin();

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav staffName={session.staffUser.name} isPlatformAdmin />
      <main className="mx-auto w-full max-w-[1800px] flex-1 px-6 py-8">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Admin
        </h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Org accounts and staff performance reporting land here in a later step.
        </p>
      </main>
    </div>
  );
}

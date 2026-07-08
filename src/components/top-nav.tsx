import { logout } from "@/app/actions/auth";
import { GuardedLink } from "@/components/guarded-link";
import { PracticeSwitcher } from "@/components/practice-switcher";

export function TopNav({
  staffName,
  isPlatformAdmin = false,
  hasOrganization = false,
  portalType,
  accessibleOrganizations = [],
  currentOrganizationId = null,
}: {
  staffName: string;
  isPlatformAdmin?: boolean;
  hasOrganization?: boolean;
  portalType?: "PRACTICE" | "CDCES";
  accessibleOrganizations?: { id: string; name: string }[];
  currentOrganizationId?: string | null;
}) {
  return (
    <header className="border-b-2 border-accent bg-white dark:bg-neutral-950">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <GuardedLink href="/" className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent" aria-hidden />
          TrackMySugar
        </GuardedLink>
        <div className="flex items-center gap-4">
          {portalType === "CDCES" && (
            <PracticeSwitcher
              organizations={accessibleOrganizations}
              currentOrganizationId={currentOrganizationId}
            />
          )}
          {hasOrganization && (
            <GuardedLink
              href="/billing"
              className="text-sm text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            >
              Billing
            </GuardedLink>
          )}
          {isPlatformAdmin && (
            <GuardedLink
              href="/admin"
              className="text-sm text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            >
              Admin
            </GuardedLink>
          )}
          <span className="text-sm text-neutral-500 dark:text-neutral-400">{staffName}</span>
          <form action={logout}>
            <button
              type="submit"
              className="text-sm text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

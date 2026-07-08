import Link from "next/link";
import { logout } from "@/app/actions/auth";

export function TopNav({
  staffName,
  isPlatformAdmin = false,
  hasOrganization = false,
}: {
  staffName: string;
  isPlatformAdmin?: boolean;
  hasOrganization?: boolean;
}) {
  return (
    <header className="border-b-2 border-accent bg-white dark:bg-neutral-950">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent" aria-hidden />
          TrackMySugar
        </Link>
        <div className="flex items-center gap-4">
          {hasOrganization && (
            <Link
              href="/billing"
              className="text-sm text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            >
              Billing
            </Link>
          )}
          {isPlatformAdmin && (
            <Link
              href="/admin"
              className="text-sm text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            >
              Admin
            </Link>
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

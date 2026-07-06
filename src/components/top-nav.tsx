import Link from "next/link";
import { logout } from "@/app/actions/auth";

export function TopNav({ staffName }: { staffName: string }) {
  return (
    <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          TrackMySugar
        </Link>
        <div className="flex items-center gap-4">
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

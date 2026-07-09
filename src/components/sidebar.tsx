"use client";

import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { GuardedLink } from "@/components/guarded-link";
import { PracticeSwitcher } from "@/components/practice-switcher";
import type { CurrentSession } from "@/lib/auth/session";

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <GuardedLink
      href={href}
      className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        active ? "bg-neutral-800 text-white" : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100"
      }`}
    >
      {label}
    </GuardedLink>
  );
}

// Thin persistent left-hand navigation, replacing the old top header bar —
// logo, current clinic (or a practice switcher for CDCES staff who can
// access more than one), then the main nav, with sign-out pinned to the
// bottom. Rendered once per authenticated page via AppShell.
export function Sidebar({ session }: { session: CurrentSession }) {
  const pathname = usePathname();
  const { staffUser, accessibleOrganizations } = session;
  const hasOrganization = !!staffUser.organizationId;

  return (
    <aside className="flex w-48 shrink-0 flex-col bg-neutral-950 text-neutral-100">
      <div className="border-b border-neutral-800 px-4 py-5">
        <GuardedLink href="/" className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent" aria-hidden />
          TrackMySugar
        </GuardedLink>
      </div>

      {(staffUser.organizationName || accessibleOrganizations.length > 0) && (
        <div className="border-b border-neutral-800 px-4 py-3">
          {staffUser.portalType === "CDCES" && accessibleOrganizations.length > 0 ? (
            <PracticeSwitcher organizations={accessibleOrganizations} currentOrganizationId={staffUser.organizationId} />
          ) : (
            staffUser.organizationName && (
              <div className="truncate rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-neutral-200">
                {staffUser.organizationName}
              </div>
            )
          )}
        </div>
      )}

      <nav className="flex-1 space-y-1 px-3 py-4">
        <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-600">Main</p>
        <NavLink href="/" label="Patients" active={pathname === "/" || pathname.startsWith("/patients")} />
        <NavLink href="/reports" label="Reports" active={pathname.startsWith("/reports")} />
        {hasOrganization && <NavLink href="/billing" label="Billing" active={pathname.startsWith("/billing")} />}
        {staffUser.isPlatformAdmin && (
          <NavLink href="/admin" label="Admin" active={pathname.startsWith("/admin")} />
        )}
      </nav>

      <div className="border-t border-neutral-800 px-4 py-4">
        <div className="mb-2 truncate text-sm text-neutral-400">{staffUser.name}</div>
        <form action={logout}>
          <button type="submit" className="text-sm text-neutral-400 hover:text-neutral-100">
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}

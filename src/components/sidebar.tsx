"use client";

import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { GuardedLink } from "@/components/guarded-link";
import { PracticeSwitcher } from "@/components/practice-switcher";
import type { CurrentSession } from "@/lib/auth/session";

// Fixed (theme-independent) green accents for the sidebar — it's always
// dark regardless of the user's OS light/dark preference, so it uses the
// same sage-green hues the rest of the app reserves for dark surfaces
// (see the @media (prefers-color-scheme: dark) block in globals.css)
// rather than the var(--accent) tokens, which flip to a light-surface
// shade in light mode and would lose contrast against this background.
function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <GuardedLink
      href={href}
      className={`block rounded-md border-l-2 px-3 py-2 text-base font-medium transition-colors ${
        active
          ? "border-[#8fbf8a] bg-[#17201a] text-[#8fbf8a]"
          : "border-transparent text-neutral-300 hover:bg-white/10 hover:text-white"
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
    <aside className="flex w-48 shrink-0 flex-col bg-gradient-to-b from-[#1c3320] via-[#122417] to-[#0a140d] text-neutral-100">
      <div className="border-b border-white/10 px-4 py-5">
        <GuardedLink href="/" className="flex items-center gap-2 text-base font-semibold text-white">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#8fbf8a]" aria-hidden />
          TrackMySugar
        </GuardedLink>
      </div>

      {(staffUser.organizationName || accessibleOrganizations.length > 0) && (
        <div className="border-b border-white/10 px-4 py-3">
          {staffUser.portalType === "CDCES" && accessibleOrganizations.length > 0 ? (
            <PracticeSwitcher organizations={accessibleOrganizations} currentOrganizationId={staffUser.organizationId} />
          ) : (
            staffUser.organizationName && (
              <div className="truncate rounded-md bg-[#17201a] px-3 py-2 text-base font-medium text-[#8fbf8a]">
                {staffUser.organizationName}
              </div>
            )
          )}
        </div>
      )}

      <nav className="flex-1 space-y-1 px-3 py-4">
        <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-neutral-600">Main</p>
        <NavLink href="/" label="Patients" active={pathname === "/" || pathname.startsWith("/patients")} />
        <NavLink href="/reports" label="Reports" active={pathname.startsWith("/reports")} />
        {hasOrganization && <NavLink href="/billing" label="Billing" active={pathname.startsWith("/billing")} />}
        {hasOrganization && staffUser.role === "ADMIN" && (
          <NavLink href="/settings" label="Settings" active={pathname.startsWith("/settings")} />
        )}
        {staffUser.isPlatformAdmin && (
          <NavLink href="/admin" label="Admin" active={pathname.startsWith("/admin")} />
        )}
      </nav>

      <div className="border-t border-white/10 px-4 py-4">
        <div className="mb-2 truncate text-base text-neutral-400">{staffUser.name}</div>
        <form action={logout}>
          <button type="submit" className="text-base text-neutral-400 hover:text-neutral-100">
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}

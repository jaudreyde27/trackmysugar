import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getCurrentSession, type CurrentSession } from "@/lib/auth/session";

// Memoized per-request so multiple Server Components/DAL calls in the same
// render pass share one session lookup instead of hammering the sessions table.
export const verifySession = cache(async (): Promise<CurrentSession> => {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }
  return session;
});

export const getOptionalSession = cache(async (): Promise<CurrentSession | null> => {
  return getCurrentSession();
});

export async function requireAdmin(): Promise<CurrentSession> {
  const session = await verifySession();
  if (session.staffUser.role !== "ADMIN") {
    redirect("/");
  }
  return session;
}

// Gate for the platform-admin area (org/staff performance reporting) —
// distinct from requireAdmin, which only checks the clinic-scoped ADMIN
// role. A clinic's own ADMIN staff must never pass this check.
export async function requirePlatformAdmin(): Promise<CurrentSession> {
  const session = await verifySession();
  if (!session.staffUser.isPlatformAdmin) {
    redirect("/");
  }
  return session;
}

// The real authorization boundary for CDCES-only mutations (starting a
// call, adding a note, logging/removing monitoring time). Hiding the
// triggering UI for Practice-portal staff is a UX nicety on top of this,
// not a substitute for it — a server action is callable directly
// regardless of what's rendered. Call this as the first line of every
// such action, right after verifySession().
export function assertCdcesPortal(session: CurrentSession): void {
  if (session.staffUser.portalType !== "CDCES") {
    throw new Error("This action requires CDCES access.");
  }
}

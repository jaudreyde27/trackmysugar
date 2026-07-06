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

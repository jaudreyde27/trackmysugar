import "server-only";
import { randomBytes, createHash } from "crypto";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/db";

export const SESSION_COOKIE_NAME = "tms_session";
const ABSOLUTE_SESSION_HOURS = 12;

function idleTimeoutMs(): number {
  const minutes = Number(process.env.SESSION_IDLE_TIMEOUT_MINUTES ?? "30");
  return (Number.isFinite(minutes) ? minutes : 30) * 60 * 1000;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function requestMeta() {
  const h = await headers();
  return {
    ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: h.get("user-agent") ?? null,
  };
}

export async function createSession(staffUserId: string) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + ABSOLUTE_SESSION_HOURS * 60 * 60 * 1000);
  const { ipAddress, userAgent } = await requestMeta();

  // CDCES-portal staff pick a default active practice once, here, at login
  // — this is the *only* place a default gets written. getCurrentSession()
  // computes a fallback in-memory on every request without persisting it,
  // so a slow parallel request can never race an explicit practice switch
  // and clobber it back to the default.
  const staffUser = await prisma.staffUser.findUnique({
    where: { id: staffUserId },
    select: { portalType: true },
  });
  let selectedOrganizationId: string | null = null;
  if (staffUser?.portalType === "CDCES") {
    const firstAccess = await prisma.staffOrganizationAccess.findFirst({
      where: { staffUserId },
      orderBy: { organization: { name: "asc" } },
      select: { organizationId: true },
    });
    selectedOrganizationId = firstAccess?.organizationId ?? null;
  }

  await prisma.session.create({
    data: { staffUserId, tokenHash, expiresAt, ipAddress, userAgent, selectedOrganizationId },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export type CurrentSession = {
  sessionId: string;
  staffUser: {
    id: string;
    email: string;
    name: string;
    role: "ADMIN" | "CLINICIAN";
    portalType: "PRACTICE" | "CDCES";
    // The *effective* org for this request — a PRACTICE user's fixed home
    // org, or a CDCES user's currently-selected practice. Every existing
    // org-scoping call site in the app reads this as "my current tenant,"
    // never "my fixed home org," so it's safe to overload this way.
    organizationId: string | null;
    organizationName: string | null;
    isPlatformAdmin: boolean;
    credential: string | null;
  };
  // CDCES-portal only — every practice this user can switch into. Empty
  // for PRACTICE/platform-admin accounts (nothing to switch between).
  accessibleOrganizations: { id: string; name: string }[];
};

// Not React-`cache`-wrapped here because this module is also used outside
// request/render scope (e.g. future API routes); callers that want
// per-request memoization should wrap this at the call site.
export async function getCurrentSession(): Promise<CurrentSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      staffUser: {
        include: {
          organization: true,
          organizationAccess: {
            include: { organization: true },
            orderBy: { organization: { name: "asc" } },
          },
        },
      },
      selectedOrganization: true,
    },
  });

  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    return null;
  }

  const idleMs = Date.now() - session.lastActiveAt.getTime();
  if (idleMs > idleTimeoutMs()) {
    await prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    return null;
  }

  if (!session.staffUser.active) {
    return null;
  }

  await prisma.session.update({
    where: { id: session.id },
    data: { lastActiveAt: new Date() },
  });

  const accessibleOrganizations = session.staffUser.organizationAccess.map((a) => ({
    id: a.organization.id,
    name: a.organization.name,
  }));

  let organizationId: string | null;
  let organizationName: string | null;

  if (session.staffUser.portalType === "CDCES") {
    // Read-only fallback if the session's selection is missing or no
    // longer in the access list (e.g. access was revoked mid-session) —
    // never written back here; only createSession() and switchPractice()
    // are allowed to persist a selection. organizationAccess is sorted
    // the same way accessibleOrganizations was derived from it, so index
    // 0 of either is the same practice.
    const stillValid =
      session.selectedOrganizationId != null &&
      accessibleOrganizations.some((o) => o.id === session.selectedOrganizationId);
    const effective = stillValid
      ? session.selectedOrganization
      : (session.staffUser.organizationAccess[0]?.organization ?? null);
    organizationId = effective?.id ?? null;
    organizationName = effective?.name ?? null;
  } else {
    organizationId = session.staffUser.organizationId;
    organizationName = session.staffUser.organization?.name ?? null;
  }

  return {
    sessionId: session.id,
    staffUser: {
      id: session.staffUser.id,
      email: session.staffUser.email,
      name: session.staffUser.name,
      role: session.staffUser.role,
      portalType: session.staffUser.portalType,
      organizationId,
      organizationName,
      isPlatformAdmin: session.staffUser.isPlatformAdmin,
      credential: session.staffUser.credential,
    },
    accessibleOrganizations,
  };
}

export async function destroyCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    const tokenHash = hashToken(token);
    await prisma.session.updateMany({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
}

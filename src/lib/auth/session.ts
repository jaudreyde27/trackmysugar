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

  await prisma.session.create({
    data: { staffUserId, tokenHash, expiresAt, ipAddress, userAgent },
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
    organizationId: string | null;
    organizationName: string | null;
    isPlatformAdmin: boolean;
  };
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
    include: { staffUser: { include: { organization: true } } },
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

  return {
    sessionId: session.id,
    staffUser: {
      id: session.staffUser.id,
      email: session.staffUser.email,
      name: session.staffUser.name,
      role: session.staffUser.role,
      organizationId: session.staffUser.organizationId,
      organizationName: session.staffUser.organization?.name ?? null,
      isPlatformAdmin: session.staffUser.isPlatformAdmin,
    },
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

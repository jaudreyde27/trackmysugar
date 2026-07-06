"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, destroyCurrentSession } from "@/lib/auth/session";
import { isRateLimited } from "@/lib/auth/rate-limit";
import { logAudit } from "@/lib/audit";

export type LoginState = { error: string } | undefined;

// A hash of a value nobody will ever type, so failed lookups still pay the
// cost of a bcrypt compare and timing doesn't reveal whether the email exists.
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEeOoJ0F/8VLGjy4KtsUHhx1LGrCsxCP7XG";

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (isRateLimited(`${ip}:${email}`)) {
    return { error: "Too many attempts. Please wait a few minutes and try again." };
  }

  const user = await prisma.staffUser.findUnique({ where: { email } });
  const passwordValid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !user.active || !passwordValid) {
    await logAudit({
      staffUserId: user?.id ?? null,
      action: "LOGIN_FAILURE",
      metadata: { email },
    });
    return { error: "Invalid email or password." };
  }

  await createSession(user.id);
  await logAudit({ staffUserId: user.id, action: "LOGIN_SUCCESS" });

  redirect("/");
}

export async function logout() {
  await destroyCurrentSession();
  redirect("/login");
}

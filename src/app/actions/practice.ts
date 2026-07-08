"use server";

import { redirect } from "next/navigation";
import { verifySession, assertCdcesPortal } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";

// CDCES-portal only — switches which practice is active for the current
// session. This is the one other place (besides createSession() at login)
// allowed to write Session.selectedOrganizationId.
export async function switchPractice(formData: FormData) {
  const session = await verifySession();
  assertCdcesPortal(session);

  const organizationId = String(formData.get("organizationId") ?? "");

  const access = await prisma.staffOrganizationAccess.findUnique({
    where: { staffUserId_organizationId: { staffUserId: session.staffUser.id, organizationId } },
  });
  if (!access) {
    throw new Error("You don't have access to that practice.");
  }

  await prisma.session.update({
    where: { id: session.sessionId },
    data: { selectedOrganizationId: organizationId },
  });

  redirect("/");
}

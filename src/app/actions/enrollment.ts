"use server";

import { headers } from "next/headers";
import { verifySession } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { createOAuthState, ENROLLMENT_LINK_TTL_MS } from "@/lib/dexcom/state";
import { logAudit } from "@/lib/audit";

// Generates a signed, patient-specific link (valid 7 days) for staff to
// send the patient directly — the patient authorizes their own Dexcom
// account by opening it, no clinician-facing "connect" action involved.
export async function generateEnrollmentLink(patientId: string): Promise<string> {
  const session = await verifySession();
  if (!session.staffUser.organizationId) {
    throw new Error("Patient not found");
  }

  const patient = await prisma.patient.findFirst({
    where: { id: patientId, organizationId: session.staffUser.organizationId },
    select: { id: true },
  });
  if (!patient) {
    throw new Error("Patient not found");
  }

  const token = createOAuthState(patientId, ENROLLMENT_LINK_TTL_MS);

  await logAudit({
    staffUserId: session.staffUser.id,
    patientId,
    action: "DEXCOM_ENROLLMENT_LINK_GENERATED",
  });

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  return `${proto}://${host}/enroll/${token}`;
}

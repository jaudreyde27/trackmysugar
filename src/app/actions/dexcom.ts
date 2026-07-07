"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function disconnectDexcom(patientId: string) {
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

  await prisma.dexcomConnection.update({
    where: { patientId },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
      encryptedAccessToken: null,
      encryptedRefreshToken: null,
      accessTokenExpiresAt: null,
    },
  });

  await logAudit({
    staffUserId: session.staffUser.id,
    patientId,
    action: "DEXCOM_DISCONNECTED",
  });

  revalidatePath(`/patients/${patientId}`);
}

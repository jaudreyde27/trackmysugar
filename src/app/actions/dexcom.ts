"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function disconnectDexcom(patientId: string) {
  const session = await verifySession();

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

import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

type LogAuditInput = {
  staffUserId: string | null;
  patientId?: string | null;
  action: string;
  metadata?: Prisma.InputJsonValue;
};

export async function logAudit({ staffUserId, patientId, action, metadata }: LogAuditInput) {
  const h = await headers();
  const ipAddress = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  await prisma.auditLog.create({
    data: {
      staffUserId,
      patientId: patientId ?? null,
      action,
      metadata,
      ipAddress,
    },
  });
}

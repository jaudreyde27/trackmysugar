import "server-only";
import { prisma } from "@/lib/db";
import type { Medication } from "@/generated/prisma/client";

export function getActiveMedications(patientId: string): Promise<Medication[]> {
  return prisma.medication.findMany({
    where: { patientId, active: true },
    orderBy: { name: "asc" },
  });
}

"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

async function assertPatientInOrg(patientId: string, organizationId: string) {
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, organizationId },
    select: { id: true },
  });
  if (!patient) throw new Error("Patient not found");
}

export async function setBilledForPeriod(patientId: string, year: number, month: number, billed: boolean) {
  const session = await verifySession();
  if (!session.staffUser.organizationId) throw new Error("Patient not found");
  await assertPatientInOrg(patientId, session.staffUser.organizationId);

  await prisma.billingPeriodStatus.upsert({
    where: { patientId_year_month: { patientId, year, month } },
    update: {
      markedBilledAt: billed ? new Date() : null,
      markedBilledByStaffUserId: billed ? session.staffUser.id : null,
    },
    create: {
      patientId,
      year,
      month,
      markedBilledAt: billed ? new Date() : null,
      markedBilledByStaffUserId: billed ? session.staffUser.id : null,
    },
  });

  await logAudit({
    staffUserId: session.staffUser.id,
    patientId,
    action: billed ? "BILLING_PERIOD_MARKED_BILLED" : "BILLING_PERIOD_UNMARKED_BILLED",
    metadata: { year, month },
  });

  revalidatePath("/billing");
}

export async function setCpt99453Completed(patientId: string, completed: boolean) {
  const session = await verifySession();
  if (!session.staffUser.organizationId) throw new Error("Patient not found");
  await assertPatientInOrg(patientId, session.staffUser.organizationId);

  await prisma.patient.update({
    where: { id: patientId },
    data: { cpt99453CompletedAt: completed ? new Date() : null },
  });

  await logAudit({
    staffUserId: session.staffUser.id,
    patientId,
    action: completed ? "CPT_99453_MARKED_COMPLETE" : "CPT_99453_UNMARKED_COMPLETE",
  });

  revalidatePath("/billing");
  revalidatePath(`/patients/${patientId}`);
}

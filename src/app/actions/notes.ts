"use server";

import { revalidatePath } from "next/cache";
import { verifySession, assertCdcesPortal } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export type AddNoteInput = {
  notes: string;
  occurredAt: string; // ISO datetime from the composer's date/time picker
  templateUsed: string | null;
};

// The Notes panel composer's "Add Note" action — a standalone chart entry,
// independent of any live call and carrying no logged time of its own (use
// "Log RPM Call Time" or the Monitoring tab for that).
export async function addNote(patientId: string, input: AddNoteInput) {
  const session = await verifySession();
  assertCdcesPortal(session);
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

  const notes = input.notes.trim();
  if (!notes) {
    throw new Error("Note text is required");
  }

  const occurredAt = new Date(input.occurredAt);

  const created = await prisma.monitoringSession.create({
    data: {
      patientId,
      staffUserId: session.staffUser.id,
      source: "NOTE",
      occurredAt: Number.isNaN(occurredAt.getTime()) ? new Date() : occurredAt,
      notes,
      templateUsed: input.templateUsed,
      communicationMethod: "ASYNCHRONOUS",
      staffCredential: session.staffUser.credential,
    },
  });

  await logAudit({
    staffUserId: session.staffUser.id,
    patientId,
    action: "NOTE_ADDED",
    metadata: { monitoringSessionId: created.id },
  });

  revalidatePath(`/patients/${patientId}`);
  return { id: created.id };
}

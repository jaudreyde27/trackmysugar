"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export type AddNoteInput = {
  notes: string;
  occurredAt: string; // ISO datetime from the composer's date/time picker
  twoWayCommunication: boolean;
  monitoringMinutes: number;
  monitoringSeconds: number;
  templateUsed: string | null;
};

// The Notes panel composer's "Add Note" action — a standalone touchpoint,
// independent of any live call. When Min/Sec is filled in, this note also
// counts toward the patient's monthly monitoring-time rollup (billing,
// compliance history) exactly like a Monitoring-tab manual entry does.
export async function addNote(patientId: string, input: AddNoteInput) {
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

  const notes = input.notes.trim();
  if (!notes) {
    throw new Error("Note text is required");
  }

  const durationSeconds =
    Math.max(0, Math.floor(input.monitoringMinutes)) * 60 + Math.max(0, Math.floor(input.monitoringSeconds));
  const occurredAt = new Date(input.occurredAt);

  const created = await prisma.monitoringSession.create({
    data: {
      patientId,
      staffUserId: session.staffUser.id,
      source: "NOTE",
      occurredAt: Number.isNaN(occurredAt.getTime()) ? new Date() : occurredAt,
      durationSeconds,
      notes,
      templateUsed: input.templateUsed,
      twoWayCommunication: input.twoWayCommunication,
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

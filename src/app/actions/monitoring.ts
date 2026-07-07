"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export type AddManualSessionInput = {
  occurredAt: string; // ISO date from the Monitoring tab's Date picker
  minutes: number;
  seconds: number;
  notes: string;
};

// Monitoring tab's standalone time-entry form — logs time without
// necessarily attaching substantive note text (unlike the Notes panel,
// where time is an optional add-on to a note).
export async function addManualMonitoringSession(patientId: string, input: AddManualSessionInput) {
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

  const durationSeconds = Math.max(0, Math.floor(input.minutes)) * 60 + Math.max(0, Math.floor(input.seconds));
  if (durationSeconds <= 0) {
    throw new Error("Duration must be greater than zero");
  }

  const occurredAt = new Date(input.occurredAt);

  const created = await prisma.monitoringSession.create({
    data: {
      patientId,
      staffUserId: session.staffUser.id,
      source: "MANUAL",
      occurredAt: Number.isNaN(occurredAt.getTime()) ? new Date() : occurredAt,
      durationSeconds,
      notes: input.notes.trim(),
    },
  });

  await logAudit({
    staffUserId: session.staffUser.id,
    patientId,
    action: "MONITORING_SESSION_ADDED",
    metadata: { monitoringSessionId: created.id },
  });

  revalidatePath(`/patients/${patientId}`);
  return { id: created.id };
}

// Only MANUAL entries are removable — CALL/NOTE rows are clinical
// documentation (talking points, visit notes) and stay part of the record.
export async function removeMonitoringSession(sessionId: string, patientId: string) {
  const session = await verifySession();
  if (!session.staffUser.organizationId) {
    throw new Error("Session not found");
  }

  const deleted = await prisma.monitoringSession.deleteMany({
    where: {
      id: sessionId,
      source: "MANUAL",
      patient: { id: patientId, organizationId: session.staffUser.organizationId },
    },
  });
  if (deleted.count === 0) {
    throw new Error("Session not found");
  }

  await logAudit({
    staffUserId: session.staffUser.id,
    patientId,
    action: "MONITORING_SESSION_REMOVED",
    metadata: { monitoringSessionId: sessionId },
  });

  revalidatePath(`/patients/${patientId}`);
}

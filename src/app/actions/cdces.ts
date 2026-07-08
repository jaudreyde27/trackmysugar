"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { verifySession, assertCdcesPortal } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { getActiveCallSession, getLastTouchpointForPatient } from "@/lib/data/monitoring";
import { getGlucoseStatsForPatient } from "@/lib/data/glucose-stats";
import { getR30Count, computeCurrentStreak } from "@/lib/sync/streak";
import { generateTalkingPoints } from "@/lib/ai/talking-points";

export async function startCdcesCall(patientId: string) {
  const session = await verifySession();
  assertCdcesPortal(session);
  if (!session.staffUser.organizationId) {
    throw new Error("Patient not found");
  }

  const existingActive = await getActiveCallSession(patientId);
  if (existingActive) {
    redirect(`/patients/${patientId}`);
  }

  const patient = await prisma.patient.findFirst({
    where: { id: patientId, organizationId: session.staffUser.organizationId },
    include: { dexcomConnection: true },
  });
  if (!patient) {
    throw new Error("Patient not found");
  }

  const [stats14, r30Count, streak, lastTouchpointAt] = await Promise.all([
    getGlucoseStatsForPatient(patientId, 14),
    getR30Count(patientId),
    computeCurrentStreak(patientId),
    getLastTouchpointForPatient(patientId),
  ]);

  const talkingPoints = await generateTalkingPoints({
    firstName: patient.firstName,
    lastName: patient.lastName,
    primaryDiagnosisCode: patient.primaryDiagnosisCode,
    cgmDevice: patient.cgmDevice,
    insulinDeliveryDevice: patient.insulinDeliveryDevice,
    streak,
    r30Count,
    averageGlucose: stats14.averageGlucose,
    gmi: stats14.gmi,
    percentVeryLow: stats14.percentVeryLow,
    percentLow: stats14.percentLow,
    percentInRange: stats14.percentInRange,
    connectionState: patient.dexcomConnection?.status ?? "NOT_CONNECTED",
    lastTouchpointAt,
  });

  const startedAt = new Date();
  const callSession = await prisma.monitoringSession.create({
    data: {
      patientId,
      staffUserId: session.staffUser.id,
      source: "CALL",
      startedAt,
      occurredAt: startedAt,
      talkingPoints,
    },
  });

  await logAudit({
    staffUserId: session.staffUser.id,
    patientId,
    action: "CDCES_CALL_STARTED",
    metadata: { callSessionId: callSession.id },
  });

  revalidatePath(`/patients/${patientId}`);
  redirect(`/patients/${patientId}`);
}

export async function updateCallNotes(sessionId: string, notes: string) {
  const session = await verifySession();
  assertCdcesPortal(session);
  if (!session.staffUser.organizationId) return;

  await prisma.monitoringSession.updateMany({
    where: {
      id: sessionId,
      source: "CALL",
      endedAt: null,
      patient: { organizationId: session.staffUser.organizationId },
    },
    data: { notes },
  });
}

export async function endCdcesCall(sessionId: string, patientId: string) {
  const session = await verifySession();
  assertCdcesPortal(session);
  if (!session.staffUser.organizationId) {
    throw new Error("Patient not found");
  }

  const call = await prisma.monitoringSession.findFirst({
    where: {
      id: sessionId,
      source: "CALL",
      endedAt: null,
      patient: { id: patientId, organizationId: session.staffUser.organizationId },
    },
    select: { startedAt: true },
  });
  if (!call) {
    throw new Error("Call session not found");
  }

  const endedAt = new Date();
  const durationSeconds = call.startedAt
    ? Math.max(0, Math.round((endedAt.getTime() - call.startedAt.getTime()) / 1000))
    : 0;

  await prisma.monitoringSession.update({
    where: { id: sessionId },
    data: { endedAt, durationSeconds },
  });

  await logAudit({
    staffUserId: session.staffUser.id,
    patientId,
    action: "CDCES_CALL_ENDED",
    metadata: { callSessionId: sessionId },
  });

  revalidatePath(`/patients/${patientId}`);
  redirect(`/patients/${patientId}`);
}

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { getActiveCallSession } from "@/lib/data/cdces";
import { getGlucoseStatsForPatient } from "@/lib/data/glucose-stats";
import { getR30Count, computeCurrentStreak } from "@/lib/sync/streak";
import { getLastTouchpointForPatient } from "@/lib/data/cdces";
import { generateTalkingPoints } from "@/lib/ai/talking-points";

export async function startCdcesCall(patientId: string) {
  const session = await verifySession();

  const existingActive = await getActiveCallSession(patientId);
  if (existingActive) {
    redirect(`/patients/${patientId}/call`);
  }

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
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

  const callSession = await prisma.cdcesCallSession.create({
    data: {
      patientId,
      staffUserId: session.staffUser.id,
      talkingPoints,
    },
  });

  await logAudit({
    staffUserId: session.staffUser.id,
    patientId,
    action: "CDCES_CALL_STARTED",
    metadata: { callSessionId: callSession.id },
  });

  redirect(`/patients/${patientId}/call`);
}

export async function updateCallNotes(sessionId: string, notes: string) {
  await verifySession();

  await prisma.cdcesCallSession.updateMany({
    where: { id: sessionId, endedAt: null },
    data: { notes },
  });
}

export async function endCdcesCall(sessionId: string, patientId: string) {
  const session = await verifySession();

  await prisma.cdcesCallSession.updateMany({
    where: { id: sessionId, endedAt: null },
    data: { endedAt: new Date() },
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

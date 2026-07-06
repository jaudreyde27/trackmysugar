import { NextRequest, NextResponse } from "next/server";
import { getOptionalSession } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";
import { getDexcomAuthorizationUrl } from "@/lib/dexcom/client";
import { createOAuthState } from "@/lib/dexcom/state";
import { logAudit } from "@/lib/audit";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const session = await getOptionalSession();
  if (!session) {
    return NextResponse.redirect(new URL("/login", _request.url));
  }

  const { patientId } = await params;
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const state = createOAuthState(patientId, session.staffUser.id);

  await logAudit({
    staffUserId: session.staffUser.id,
    patientId,
    action: "DEXCOM_CONNECT_INITIATED",
  });

  return NextResponse.redirect(getDexcomAuthorizationUrl(state));
}

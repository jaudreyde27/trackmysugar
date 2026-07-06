import { NextRequest, NextResponse } from "next/server";
import { getOptionalSession } from "@/lib/auth/dal";
import { verifyOAuthState } from "@/lib/dexcom/state";
import { exchangeCodeForToken } from "@/lib/dexcom/client";
import { saveDexcomTokens } from "@/lib/dexcom/connection";
import { logAudit } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const session = await getOptionalSession();
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const dexcomError = request.nextUrl.searchParams.get("error");

  if (dexcomError) {
    return NextResponse.redirect(
      new URL(`/?dexcomError=${encodeURIComponent(dexcomError)}`, request.url)
    );
  }

  if (!code || !state) {
    return NextResponse.json({ error: "Missing code or state" }, { status: 400 });
  }

  const payload = verifyOAuthState(state);
  if (!payload) {
    return NextResponse.json({ error: "Invalid or expired state" }, { status: 400 });
  }

  try {
    const tokens = await exchangeCodeForToken(code);
    await saveDexcomTokens(payload.patientId, tokens);

    await logAudit({
      staffUserId: session.staffUser.id,
      patientId: payload.patientId,
      action: "DEXCOM_CONNECT_COMPLETED",
    });

    return NextResponse.redirect(new URL(`/patients/${payload.patientId}`, request.url));
  } catch (err) {
    await logAudit({
      staffUserId: session.staffUser.id,
      patientId: payload.patientId,
      action: "DEXCOM_CONNECT_FAILED",
      metadata: { error: err instanceof Error ? err.message : String(err) },
    });

    return NextResponse.redirect(
      new URL(`/patients/${payload.patientId}?dexcomError=connect_failed`, request.url)
    );
  }
}

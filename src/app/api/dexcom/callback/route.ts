import { NextRequest, NextResponse } from "next/server";
import { verifyOAuthState } from "@/lib/dexcom/state";
import { exchangeCodeForToken } from "@/lib/dexcom/client";
import { saveDexcomTokens } from "@/lib/dexcom/connection";
import { logAudit } from "@/lib/audit";

// Public route — the patient, not a logged-in staff member, lands here
// after authorizing on Dexcom's side. The signed state token (not a staff
// session) is what proves this request is legitimate.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const dexcomError = request.nextUrl.searchParams.get("error");

  if (!state) {
    return NextResponse.json({ error: "Missing state" }, { status: 400 });
  }

  const payload = verifyOAuthState(state);
  if (!payload) {
    return NextResponse.json({ error: "Invalid or expired state" }, { status: 400 });
  }

  const enrollUrl = new URL(`/enroll/${state}`, request.url);

  if (dexcomError) {
    enrollUrl.searchParams.set("error", dexcomError);
    return NextResponse.redirect(enrollUrl);
  }

  if (!code) {
    enrollUrl.searchParams.set("error", "missing_code");
    return NextResponse.redirect(enrollUrl);
  }

  try {
    const tokens = await exchangeCodeForToken(code);
    await saveDexcomTokens(payload.patientId, tokens);

    await logAudit({
      staffUserId: null,
      patientId: payload.patientId,
      action: "DEXCOM_CONNECT_COMPLETED",
    });

    return NextResponse.redirect(enrollUrl);
  } catch (err) {
    await logAudit({
      staffUserId: null,
      patientId: payload.patientId,
      action: "DEXCOM_CONNECT_FAILED",
      metadata: { error: err instanceof Error ? err.message : String(err) },
    });

    enrollUrl.searchParams.set("error", "connect_failed");
    return NextResponse.redirect(enrollUrl);
  }
}

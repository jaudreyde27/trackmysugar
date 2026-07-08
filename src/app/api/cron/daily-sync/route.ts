import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { runDailySync } from "@/lib/sync/run";

function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;

  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function handle(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await runDailySync();
  return NextResponse.json(summary);
}

// Vercel Cron issues a GET with the CRON_SECRET as a bearer token
// automatically; POST stays available for manual/external schedulers
// (GitHub Actions, a plain cron job, etc.) that call it directly.
export const GET = handle;
export const POST = handle;

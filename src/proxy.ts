import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

// Optimistic redirect only (cookie presence, not DB validity) to avoid
// slow/duplicate DB reads on every navigation and prefetch. Real
// authorization happens in the Data Access Layer (src/lib/auth/dal.ts),
// which every page/route handler calls before touching patient data.
const PUBLIC_PATHS = ["/login"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/dexcom/callback") || pathname.startsWith("/api/cron/")) {
    return NextResponse.next();
  }

  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  if (!hasSessionCookie && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (hasSessionCookie && isPublicPath) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

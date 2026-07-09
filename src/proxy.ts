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

  if (
    pathname.startsWith("/api/dexcom/callback") ||
    pathname.startsWith("/api/cron/") ||
    pathname.startsWith("/enroll/")
  ) {
    return NextResponse.next();
  }

  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  if (!hasSessionCookie && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // No "cookie present → bounce /login to /" branch here on purpose: session
  // invalidation (idle timeout, absolute expiry) revokes the DB row but
  // never clears the browser cookie, only an explicit logout does. A
  // cookie-presence-only redirect here would bounce an expired-but-cookied
  // visitor from /login to / — where the real DB check in verifySession()
  // rejects the stale session and sends them back to /login — forever.
  // The login page already does the "already signed in → go home" redirect
  // itself with a real session check (src/app/login/page.tsx), so this
  // route is safe to just fall through to.

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

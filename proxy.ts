import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Optimistic redirect for the private area: signed-out visitors (no Better
 * Auth session cookie) jump straight to /login without paying for a
 * server-render of the profile shell. Presence of the cookie is NOT proof
 * of a valid session — app/profile/page.tsx re-verifies with Better Auth
 * and redirects again if the cookie is stale or forged.
 */
export function proxy(request: NextRequest) {
  const hasSessionCookie = request.cookies
    .getAll()
    .some((cookie) =>
      cookie.name.endsWith("better-auth.session_token"),
    );
  if (!hasSessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?redirect=${encodeURIComponent("/profile")}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/profile", "/profile/:path*"],
};

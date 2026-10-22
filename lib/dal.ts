import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "./auth";

/**
 * Data access layer for the session. Better Auth owns session storage; these
 * helpers narrow what pages and route handlers may touch.
 */

export interface SessionUser {
  id: string;
  name: string;
  email: string;
}

/** Current user, or null when signed out. Never throws. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  const { id, name, email } = session.user;
  return { id, name, email: email ?? "" };
}

/**
 * Pages call this inside a <Suspense> boundary: signed-out visitors are
 * redirected to /login (preserving the destination) instead of receiving a
 * 500. Route handlers use `getSessionUser` + explicit 401s instead.
 */
export async function requireUser(redirectTo = "/profile"): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(redirectTo)}`);
  }
  return user;
}

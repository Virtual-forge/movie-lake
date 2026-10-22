import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "./db";

/**
 * Better Auth server config (plan: Better Auth with the Prisma adapter,
 * email/password enabled, Google in socialProviders when credentials exist,
 * and the Next.js cookies plugin so Server Actions can set cookies).
 *
 * NOTE: intentionally does NOT import `server-only` or `lib/env.ts` — the
 * Better Auth CLI (`better-auth generate`) evaluates this file from a plain
 * Node process. Runtime credentials arrive via Next.js env loading
 * (`.env`/`.env.local`); Better Auth reads BETTER_AUTH_SECRET itself.
 */

/**
 * Browser origins allowed to call the auth API — Better Auth rejects
 * cross-origin POSTs otherwise, and the deployment had BETTER_AUTH_URL set
 * to an empty string, so prod registration/sign-in failed with
 * "Invalid origin" (found by the first full auth-on-prod e2e sweep, M11.1).
 * The option is ADDITIVE to Better Auth's own baseURL-derived origin
 * (verified in the installed 1.7.12 `getTrustedOrigins`), so localhost dev
 * keeps its default. Two runtime notes that shaped this list:
 * `VERCEL_URL` is the per-DEPLOYMENT url (hash-prefixed), not the
 * production alias, so it alone cannot cover prod traffic; the production
 * alias is public (it is already in PROJECT_PLAN.md and every prod link)
 * and therefore listed explicitly. BETTER_AUTH_URL still wins when the
 * operator sets it (e.g. a future custom domain).
 */
const PRODUCTION_ORIGIN = "https://movie-lake-lovat.vercel.app";

const trustedOrigins = [
  PRODUCTION_ORIGIN,
  process.env.BETTER_AUTH_URL || undefined,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
].filter((origin): origin is string => Boolean(origin));

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    /* Minimum password length below Better Auth's default 8 is not allowed. */
    minPasswordLength: 8,
  },
  trustedOrigins,
  socialProviders: process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
      }
    : {},
  session: {
    /* TMDB caps cached data at 6 months; auth sessions are far shorter-lived. */
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh expiry once a day
  },
  plugins: [
    nextCookies(), // must be the last plugin
  ],
});

export type Auth = typeof auth;

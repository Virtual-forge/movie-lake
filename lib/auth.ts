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
export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    /* Minimum password length below Better Auth's default 8 is not allowed. */
    minPasswordLength: 8,
  },
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

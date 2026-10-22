import "server-only";
import { z } from "zod";

/**
 * Server-side environment schema — validated on first use so a missing or
 * malformed token fails fast in dev and at boot, never deep inside a render.
 * Client components intentionally cannot import anything from `lib/env.ts`
 * (guarded by `server-only`).
 */

const envSchema = z.object({
  /** Long JWT "API Read Access Token" from themoviedb.org → Settings → API. */
  TMDB_API_READ_TOKEN: z
    .string()
    .min(50, "TMDB token looks truncated")
    .startsWith("eyJ", "TMDB token must be the JWT 'API Read Access Token'"),
});

const authEnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .startsWith("postgresql://", "DATABASE_URL must be a postgres:// connection string"),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
});

export function getTmdbToken(): string {
  const parsed = envSchema.safeParse({
    TMDB_API_READ_TOKEN: process.env.TMDB_API_READ_TOKEN,
  });
  if (!parsed.success) {
    throw new Error(
      "TMDB_API_READ_TOKEN is missing or malformed. Add it to .env.local " +
        "(copy of the 'API Read Access Token' from themoviedb.org → Settings → API). " +
        `Details: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
    );
  }
  return parsed.data.TMDB_API_READ_TOKEN;
}

/** Database + auth credentials, validated on first use (fail fast at boot). */
export function getAuthEnv(): z.infer<typeof authEnvSchema> {
  const parsed = authEnvSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || undefined,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || undefined,
  });
  if (!parsed.success) {
    throw new Error(
      "Auth/database environment is missing or malformed (DATABASE_URL, " +
        "BETTER_AUTH_SECRET, optional GOOGLE_CLIENT_ID/SECRET). " +
        `Details: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
    );
  }
  return parsed.data;
}

/** Google OAuth is optional; UI renders email/password only until creds exist. */
export function getGoogleProvider(): {
  clientId: string;
  clientSecret: string;
} | null {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = getAuthEnv();
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return null;
  return { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET };
}

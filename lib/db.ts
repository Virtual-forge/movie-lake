import "dotenv/config"; // prisma.config.ts + CLI interaction (outside Next.js env loading)
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

/**
 * Prisma 7 client (driver adapter, no query engine). Singleton via the
 * global cache so HMR does not open a new pool on every reload.
 *
 * NOTE: intentionally does NOT import `server-only` — the Better Auth CLI
 * (`better-auth generate`) imports the auth config, which reaches this
 * module from a plain Node process.
 */
function getConnectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url || !url.startsWith("postgresql://")) {
    throw new Error(
      "DATABASE_URL is missing or invalid. Copy .env.example values into .env " +
        "(local Postgres: docker compose up -d) before touching the database.",
    );
  }
  return url;
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: getConnectionString() });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

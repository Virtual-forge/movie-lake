import "server-only";
import { connection } from "next/server";
import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/lib/db";
import {
  archiveItemView,
  type ArchiveItemView,
} from "@/lib/api/internet-archive";

/**
 * Watch-page resolution for curated free films
 * (docs/PROJECT_PLAN.md → "Watch Page"). The FreeFilm row is a live DB
 * read (curation is prompt-sent, a single indexed lookup), while the
 * Internet Archive verification is cached for an hour — it is a remote
 * availability check, not a license claim.
 *
 * `connection()` marks the DB read as request-time data: without it the
 * prerender attempted the pg connection (whose SCRAM handshake calls
 * `crypto.getRandomValues()`), which cacheComponents rejects as an
 * unstable value. Pages still prerender their static shells around this.
 */

export interface FreeFilmInfo {
  tmdbId: number;
  archiveIdentifier: string;
  license: string;
  licenseUrl?: string;
  notes?: string;
  /** Verified item, or null when the Internet Archive check can't confirm it. */
  archive: ArchiveItemView | null;
}

/** The curated row for a TMDB movie, or null when the film is not free. */
async function findFreeFilmRow(
  tmdbId: number,
): Promise<
  { archiveIdentifier: string; license: string; licenseUrl: string | null; notes: string | null } | null
> {
  const row = await prisma.freeFilm.findUnique({ where: { tmdbId } });
  if (!row) return null;
  return {
    archiveIdentifier: row.archiveIdentifier,
    license: row.license,
    licenseUrl: row.licenseUrl,
    notes: row.notes,
  };
}

async function archivedItem(
  identifier: string,
): Promise<ArchiveItemView | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(`archive:${identifier}`);
  return archiveItemView(identifier);
}

/**
 * Full watch data for a TMDB movie: the curated record plus a fresh
 * verification of the Internet Archive item. `row !== null` but
 * `archive === null` means "seeded, but the copy is unverified right
 * now" — an important honest distinction for the watch page.
 */
export async function resolveFreeFilm(
  tmdbId: number,
): Promise<FreeFilmInfo | null> {
  // Request-time data access: the pg connection may not happen inside a
  // prerender (see module comment).
  await connection();
  const row = await findFreeFilmRow(tmdbId);
  if (!row) return null;
  return {
    tmdbId,
    archiveIdentifier: row.archiveIdentifier,
    license: row.license,
    licenseUrl: row.licenseUrl ?? undefined,
    notes: row.notes ?? undefined,
    archive: await archivedItem(row.archiveIdentifier),
  };
}

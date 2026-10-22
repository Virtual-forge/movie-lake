import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

/**
 * Curated FreeFilm seed (docs/PROJECT_PLAN.md → "FreeFilm" model).
 * Every entry below was verified on 2026-10-22, live:
 *  - the Internet Archive item via the metadata API (mediatype movies +
 *    playable video files; recorded into test/fixtures for the archive
 *    client's unit tests),
 *  - the film's TMDB id via the live /search/movie endpoint,
 *  - the license claim against a citable source: Wikipedia's "List of
 *    films in the public domain in the United States" for the PD titles
 *    (pre-1931 rule / missing notice / non-renewal reasons are quoted per
 *    row) and the item's own machine-readable licenseurl for CC titles.
 *
 * Public-domain status varies by country; entries claim US status only,
 * notes carry the evidence, and the watch page shows them.
 *
 * Run: pnpm exec prisma db seed (DATABASE_URL from .env via lib/db's env
 * loader — this seed re-uses the same pattern with PrismaPg).
 */

function requireDbUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url || !url.startsWith("postgresql://")) {
    throw new Error(
      "DATABASE_URL is missing or invalid. Copy .env values into the environment before seeding.",
    );
  }
  return url;
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: requireDbUrl() }) });

const WIKIPEDIA_PD_LIST =
  "https://en.wikipedia.org/wiki/List_of_films_in_the_public_domain_in_the_United_States";

interface SeedEntry {
  tmdbId: number;
  /** Display title, human bookkeeping only (TMDB owns the real title). */
  title: string;
  archiveIdentifier: string;
  license: string;
  licenseUrl?: string;
  notes?: string;
}

const ENTRIES: SeedEntry[] = [
  {
    title: "A Trip to the Moon",
    tmdbId: 775,
    archiveIdentifier: "ATripToTheMoonGeorgeMelies",
    license: "Public domain (US)",
    licenseUrl: WIKIPEDIA_PD_LIST,
    notes:
      "Released 1902 — all motion pictures published before 1931 are public domain in the United " +
      "States. IA item verified 2026-10-22 via the metadata API (movies item, MPEG4 files present).",
  },
  {
    title: "Nosferatu",
    tmdbId: 653,
    archiveIdentifier: "Nosferatu_DVD_quality",
    license: "Public domain (US)",
    licenseUrl: WIKIPEDIA_PD_LIST,
    notes:
      "Released 1922 — pre-1931 rule; the copy is the 93-minute complete version that IA carries " +
      "(the embed plays it in five connected parts). The item itself declares a CC public-domain " +
      "certification mark. Verified 2026-10-22 via the metadata API.",
  },
  {
    title: "Night of the Living Dead",
    tmdbId: 10331,
    archiveIdentifier: "Night.Of.The.Living.Dead_1080p",
    license: "Public domain (US)",
    licenseUrl: WIKIPEDIA_PD_LIST,
    notes:
      "Released 1968 — the original theatrical distributor (Walter Reade Organization) omitted the " +
      "copyright notice from the release prints, so the film entered the US public domain immediately. " +
      "This copy is the original cut (96 min); the later Criterion restoration remains copyrighted and " +
      "is not used. Item carries a CC public-domain licenseurl plus a 'Public Domain' rights field. " +
      "Verified 2026-10-22.",
  },
  {
    title: "Carnival of Souls",
    tmdbId: 16093,
    archiveIdentifier: "CarnivalofSouls",
    license: "Public domain (US)",
    licenseUrl: WIKIPEDIA_PD_LIST,
    notes:
      "Released 1962 — missing copyright notice ('Carnival of Souls', Wikipedia PD list, reason: " +
      "missing notice). Item declares a CC public-domain licenseurl. Verified 2026-10-22.",
  },
  {
    title: "Detour",
    tmdbId: 20367,
    archiveIdentifier: "Detour",
    license: "Public domain (US)",
    licenseUrl: WIKIPEDIA_PD_LIST,
    notes:
      "Released 1945 — copyright not renewed ('Detour', Wikipedia PD list). Item declares a CC " +
      "public-domain licenseurl. Verified 2026-10-22.",
  },
  {
    title: "D.O.A.",
    tmdbId: 18995,
    archiveIdentifier: "doa_ipod",
    license: "Public domain (US)",
    licenseUrl: WIKIPEDIA_PD_LIST,
    notes:
      "Released 1949 — copyright not renewed (Wikipedia PD list; TMDB dates its release 1949-12-23, " +
      "the IA item's own noisy date field reads 1955 and is ignored). Item declares a CC public-domain " +
      "licenseurl. Verified 2026-10-22.",
  },
  {
    title: "Big Buck Bunny",
    tmdbId: 10378,
    archiveIdentifier: "BigBuckBunny_124",
    license: "CC BY 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
    notes:
      "Blender Foundation open movie. The IA item declares licenseurl CC BY 3.0, confirmed in the " +
      "item metadata. Verified 2026-10-22.",
  },
];

async function main() {
  for (const entry of ENTRIES) {
    const { tmdbId, title, ...data } = entry;
    await prisma.freeFilm.upsert({
      where: { tmdbId },
      update: data,
      create: { tmdbId, ...data },
    });
    console.log(`seeded ${entry.tmdbId} — ${title} (${entry.archiveIdentifier})`);
  }
  const total = await prisma.freeFilm.count();
  console.log(`FreeFilm rows: ${total}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

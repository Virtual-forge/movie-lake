/**
 * Favorites domain logic shared by client and server. Pure functions only —
 * no `server-only`, no Prisma import — so the client bundle and the unit
 * tests can both use it (unit tests cover every branch).
 */
import type { Listing } from "@/types/listing";

/** Favorite row shape as shipped from `/api/favorites` (JSON DTO). */
export interface FavoriteDTO {
  id: string;
  /** Pre-computed route (e.g. "/movie/123") — the favorite key. */
  itemId: string;
  /** "MOVIE" | "TV" (BOOK stays defined in the schema but deferred). */
  type: "MOVIE" | "TV";
  title: string;
  /** TMDB poster path ("/abc.jpg"); full URL is built at render time. */
  posterPath: string;
  /** Canonical genre slugs captured at save time. */
  genres: string[];
  year?: number;
  /** ISO timestamp. */
  createdAt: string;
}

const FAVORITE_ROUTE_RE = /^\/(movie|tv)\/(\d+)$/;

export type FavoriteMediaInfo = {
  source: "TMDB";
  type: "MOVIE" | "TV";
  /** Numeric id inside the source, as a string (stored as text). */
  externalId: string;
};

/** Parses a listing route ("/movie/123") into stored favorite keys. */
export function parseFavoriteRoute(route: string): FavoriteMediaInfo | null {
  const match = FAVORITE_ROUTE_RE.exec(route);
  if (!match) return null;
  return {
    source: "TMDB",
    type: match[1] === "movie" ? "MOVIE" : "TV",
    externalId: match[2],
  };
}

/** Builds the listing route from stored favorite keys. */
export function buildFavoriteRoute(
  type: "MOVIE" | "TV",
  externalId: string,
): string {
  return `/${type === "MOVIE" ? "movie" : "tv"}/${externalId}`;
}

/**
 * TMDB poster paths are stored without the size prefix so profile pages can
 * request any size: "https://image.tmdb.org/t/p/w342/abc.jpg" → "/abc.jpg".
 */
export function tmdbPosterPathFromUrl(posterUrl: string): string | undefined {
  try {
    const { pathname } = new URL(posterUrl);
    const marker = "/t/p/";
    const markerAt = pathname.indexOf(marker);
    if (markerAt === -1) return undefined;
    const rest = pathname.slice(markerAt + marker.length);
    const sizeDir = rest.indexOf("/");
    if (sizeDir === -1) return undefined;
    const path = rest.slice(sizeDir + 1);
    return path.length > 0 ? `/${path}` : undefined;
  } catch {
    return undefined;
  }
}

/** The snapshot payload a client POSTs when toggling a favorite on. */
export function favoriteSnapshotFromListing(listing: Listing): {
  title: string;
  posterPath?: string;
  genres: string[];
  year?: number;
} {
  return {
    title: listing.title,
    posterPath: tmdbPosterPathFromUrl(listing.poster),
    genres: listing.genres,
    ...(listing.year === undefined ? {} : { year: listing.year }),
  };
}

/**
 * Genre tabs on the profile page derive from the user's actual favorites —
 * unique slugs with counts, descending count, then alphabetical.
 */
export function computeGenreTabs(
  favorites: Array<{ genres: string[] }>,
): Array<{ slug: string; count: number }> {
  const counts = new Map<string, number>();
  for (const favorite of favorites) {
    for (const slug of favorite.genres) {
      counts.set(slug, (counts.get(slug) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([slug, count]) => ({ slug, count }))
    .sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug));
}

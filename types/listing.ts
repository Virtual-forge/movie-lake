import type { GenreSlug } from "@/lib/genres";

export type MediaKind = "film" | "series";
export type ListingSource = "tmdb";

/**
 * The app-level listing shape every card, rail and detail page renders.
 * Mirrors docs/PROJECT_PLAN.md's UnifiedListing (movie/TV subset); the demo
 * catalog bridges into it without a database.
 */
export interface Listing {
  source: ListingSource;
  kind: MediaKind;
  /** Numeric id inside the source (TMDB id; synthetic for the demo catalog). */
  externalId: number;
  /** Pre-computed href (e.g. /movie/123 or /tv/456). */
  route: string;
  title: string;
  year?: number;
  /** 0–10 scale vote_average (TMDB) or equivalent aggregate. */
  rating?: number;
  voteCount?: number;
  /** MPA/TV advisory where the source provides one (US). */
  contentRating?: string;
  runtimeMin?: number;
  /** Series network (TMDB networks) — small chip. */
  network?: string;
  /** Film distributor / production company — small chip. */
  distributor?: string;
  genres: GenreSlug[];
  /** Portrait artwork (2:3, TMDB w342). Always present — normalizers skip
   * results without usable poster art. */
  poster: string;
  /** Wide artwork (TMDB w780). */
  backdrop?: string;
  /** Small wide crop for landscape thumbs (TMDB w300). */
  thumb?: string;
  overview?: string;
}

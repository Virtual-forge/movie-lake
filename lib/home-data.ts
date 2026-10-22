import { cacheLife, cacheTag } from "next/cache";
import {
  discoverMovies,
  discoverTv,
  movieDetails,
  trendingAll,
  trendingMovies,
  trendingTv,
  tvDetails,
  type TmdbMediaResult,
} from "@/lib/api/tmdb";
import {
  normalizeMediaResult,
  normalizeMovieDetails,
  normalizeTvDetails,
} from "@/lib/normalize";
import type { Listing } from "@/types/listing";

/**
 * Homepage data — each section is a `use cache` scope so the whole route
 * prerenders into the static shell (docs/PROJECT_PLAN.md: trending ~1 h,
 * new releases recomputed on each cache fill).
 *
 * Timestamps (`Date.now()` for the "New" window) are allowed inside use
 * cache: the value is computed once per cache fill and shared across users,
 * per the cache-components randoms/timestamps rule.
 */

const NEW_WINDOW_DAYS = 90;
/** Discover without this floor surfaces announced-but-unreleased filler. */
const NEW_MIN_VOTES = 20;

function withKindFallback(
  results: TmdbMediaResult[] | undefined,
  fallbackKind: "movie" | "tv",
): Listing[] {
  return (results ?? [])
    .map((result) => normalizeMediaResult(result, fallbackKind))
    .filter((listing): listing is Listing => listing !== null);
}

/** Merge movie and tv lists so the two kinds alternate. */
function interleave(movies: Listing[], series: Listing[]): Listing[] {
  const out: Listing[] = [];
  const length = Math.max(movies.length, series.length);
  for (let i = 0; i < length; i += 1) {
    if (movies[i]) out.push(movies[i]);
    if (series[i]) out.push(series[i]);
  }
  return out;
}

async function loadEnriched(result: TmdbMediaResult): Promise<Listing | null> {
  try {
    if (result.media_type === "tv") {
      return normalizeTvDetails(await tvDetails(result.id, ["content_ratings"]));
    }
    return normalizeMovieDetails(await movieDetails(result.id, ["release_dates"]));
  } catch {
    // Details enrichment is best-effort; sections fall back to list data.
    return normalizeMediaResult(result, result.media_type === "tv" ? "tv" : "movie");
  }
}

/** Featured slider: top trending items with wide art, enriched to full detail. */
export async function getHeroSlides(): Promise<Listing[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("tmdb-trending");

  const day = await trendingAll("day");
  const candidates = (day.results ?? [])
    .filter(
      (r): r is TmdbMediaResult & { media_type: "movie" | "tv" } =>
        (r.media_type === "movie" || r.media_type === "tv") &&
        Boolean((r.title ?? r.name) && r.backdrop_path && r.poster_path),
    )
    .slice(0, 6);

  const slides = (await Promise.allSettled(candidates.map(loadEnriched)))
    .flatMap((settled) => (settled.status === "fulfilled" ? [settled.value] : []))
    .filter((listing): listing is Listing => listing !== null);

  return slides.filter((slide) => slide.backdrop).slice(0, 4);
}

/** "Now watching": trending series of the day, enriched with runtime/network. */
export async function getNowWatching(): Promise<Listing[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("tmdb-trending");

  const tv = await trendingTv("day");
  const candidates = (tv.results ?? [])
    .filter((r) => Boolean((r.name ?? r.title) && r.poster_path))
    .slice(0, 3);

  const enriched = (await Promise.allSettled(candidates.map(loadEnriched)))
    .flatMap((settled) => (settled.status === "fulfilled" ? [settled.value] : []))
    .filter((listing): listing is Listing => listing !== null);

  return enriched.filter((listing) => listing.kind === "series").slice(0, 3);
}

/** "Trending" rail: this week's most-watched films and series, interleaved. */
export async function getTrendingRail(): Promise<Listing[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("tmdb-trending");

  const [movies, tv] = await Promise.all([
    trendingMovies("week"),
    trendingTv("week"),
  ]);
  return interleave(
    withKindFallback(movies.results, "movie"),
    withKindFallback(tv.results, "tv"),
  ).slice(0, 10);
}

/** "New" rail: released in the last 90 days, ranked by popularity. */
export async function getNewRail(): Promise<Listing[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("tmdb-discover");

  const dateFrom = new Date(Date.now() - NEW_WINDOW_DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const [movies, tv] = await Promise.all([
    discoverMovies({ dateFrom, minVoteCount: NEW_MIN_VOTES }),
    discoverTv({ dateFrom, minVoteCount: NEW_MIN_VOTES }),
  ]);
  return interleave(
    withKindFallback(movies.results, "movie"),
    withKindFallback(tv.results, "tv"),
  ).slice(0, 10);
}

import "server-only";
import { getTmdbToken } from "@/lib/env";

/**
 * Minimal TMDB v3 API client (Bearer token auth).
 *
 * Deliberately uncached: callers wrap endpoints in `use cache` scopes with
 * explicit cacheLife profiles, so cache policy lives at the call site
 * (docs/PROJECT_PLAN.md: search ~5 min, trending ~1 h, details ~24 h).
 */

const BASE_URL = "https://api.themoviedb.org/3";

const REQUEST_TIMEOUT_MS = 8_000;

export class TmdbError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "TmdbError";
    this.status = status;
  }
}

function buildUrl(
  path: string,
  params: Record<string, string | number | undefined> = {},
): URL {
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set("language", "en-US");
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url;
}

export async function tmdbGet<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
  signal?: AbortSignal,
): Promise<T> {
  const token = getTmdbToken();
  let response: Response;
  try {
    response = await fetch(buildUrl(path, params), {
      headers: {
        Authorization: `Bearer ${token}`,
        accept: "application/json",
      },
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)])
        : AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new TmdbError(
      `TMDB request to ${path} failed: ${error instanceof Error ? error.message : "network failure"}`,
      0,
    );
  }
  if (!response.ok) {
    throw new TmdbError(`TMDB request to ${path} failed with status ${response.status}`, response.status);
  }
  return (await response.json()) as T;
}

/* ------------------------------------------------------------------ */
/* Shared DTOs (subset of the responses the UI consumes)               */
/* ------------------------------------------------------------------ */

export type TmdbMediaType = "movie" | "tv";

export interface TmdbMediaResult {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  vote_count?: number;
  genre_ids?: number[];
  original_language?: string;
  popularity?: number;
}

export interface TmdbPaginated<T> {
  page: number;
  results: T[];
  total_pages?: number;
  total_results?: number;
}

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbReleaseDatesEnvelope {
  iso_3166_1: string;
  release_dates: Array<{ certification: string; note?: string }>;
}

export interface TmdbContentRating {
  iso_3166_1: string;
  rating: string;
}

export interface TmdbCompany {
  id: number;
  name: string;
}

export interface TmdbNetwork {
  id: number;
  name: string;
}

export interface TmdbCastMember {
  id: number;
  name: string;
  character?: string;
  profile_path?: string | null;
  order?: number;
}

export interface TmdbCredits {
  cast?: TmdbCastMember[];
}

export interface TmdbVideo {
  id: string;
  key: string;
  name?: string;
  site: string;
  type: string;
  official?: boolean;
}

export interface TmdbWatchProviderItem {
  provider_id: number;
  provider_name?: string;
  logo_path?: string | null;
  display_priority?: number;
}

/** One country's offer set (link + flatrate/rent/buy provider lists). */
export interface TmdbWatchProviderSet {
  link?: string | null;
  flatrate?: TmdbWatchProviderItem[];
  rent?: TmdbWatchProviderItem[];
  buy?: TmdbWatchProviderItem[];
}

/** watch/providers append: { results: { US: {...}, GB: {...} } } */
export interface TmdbWatchProviders {
  results?: Record<string, TmdbWatchProviderSet>;
}

export interface TmdbExternalIds {
  imdb_id?: string | null;
  facebook_id?: string | null;
  instagram_id?: string | null;
  twitter_id?: string | null;
  wikidata_id?: string | null;
}

export interface TmdbSeason {
  id: number;
  name: string;
  episode_count: number;
  air_date?: string;
  season_number?: number;
  poster_path?: string | null;
}

export interface TmdbPagedExtra {
  results?: TmdbMediaResult[];
}

export interface TmdbMovieDetails {
  id: number;
  title?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  vote_average?: number;
  vote_count?: number;
  runtime?: number;
  genres?: TmdbGenre[];
  production_companies?: TmdbCompany[];
  release_dates?: { results: TmdbReleaseDatesEnvelope[] };
  credits?: TmdbCredits;
  videos?: { results?: TmdbVideo[] };
  recommendations?: TmdbPagedExtra;
  external_ids?: TmdbExternalIds;
  ["watch/providers"]?: TmdbWatchProviders;
}

export interface TmdbTvDetails {
  id: number;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  first_air_date?: string;
  vote_average?: number;
  vote_count?: number;
  episode_run_time?: number[];
  genres?: TmdbGenre[];
  networks?: TmdbNetwork[];
  content_ratings?: { results: TmdbContentRating[] };
  seasons?: TmdbSeason[];
  credits?: TmdbCredits;
  videos?: { results?: TmdbVideo[] };
  recommendations?: TmdbPagedExtra;
  external_ids?: TmdbExternalIds;
  ["watch/providers"]?: TmdbWatchProviders;
}

/* ------------------------------------------------------------------ */
/* Endpoints                                                           */
/* ------------------------------------------------------------------ */

export async function trendingAll(
  window: "day" | "week",
): Promise<TmdbPaginated<TmdbMediaResult>> {
  return tmdbGet(`/trending/all/${window}`);
}

export async function trendingMovies(
  window: "day" | "week",
): Promise<TmdbPaginated<TmdbMediaResult>> {
  return tmdbGet(`/trending/movie/${window}`);
}

export async function trendingTv(
  window: "day" | "week",
): Promise<TmdbPaginated<TmdbMediaResult>> {
  return tmdbGet(`/trending/tv/${window}`);
}

export async function movieDetails(
  id: number,
  appendToResponse?: string[],
): Promise<TmdbMovieDetails> {
  return tmdbGet(`/movie/${id}`, {
    append_to_response: appendToResponse?.join(","),
  });
}

export async function tvDetails(
  id: number,
  appendToResponse?: string[],
): Promise<TmdbTvDetails> {
  return tmdbGet(`/tv/${id}`, {
    append_to_response: appendToResponse?.join(","),
  });
}

export interface DiscoverOptions {
  sortBy?: string;
  /** ISO date (YYYY-MM-DD) lower bound. */
  dateFrom?: string;
  /** ISO date (YYYY-MM-DD) upper bound. */
  dateTo?: string;
  /** Canonical genre slug → with_genres value resolved by the caller. */
  genreIds?: string;
  minVoteCount?: number;
  /** TMDB vote_average.gte (advanced search rating range). */
  ratingMin?: number;
  /** TMDB vote_average.lte (advanced search rating range). */
  ratingMax?: number;
  page?: number;
}

/**
 * App-level sort values (docs/PROJECT_PLAN.md: no TMDB strings in the URL)
 * mapped to per-kind TMDB sort fields at the client boundary. Both value
 * sets were verified against the live API on 2026-10-22.
 */
export type TmdbSortValue = "popularity" | "rating" | "newest" | "title";

export function tmdbSortBy(value: TmdbSortValue, kind: "movie" | "tv"): string {
  switch (value) {
    case "popularity":
      return "popularity.desc";
    case "rating":
      return "vote_average.desc";
    case "newest":
      return kind === "movie" ? "primary_release_date.desc" : "first_air_date.desc";
    case "title":
      return kind === "movie" ? "title.asc" : "name.asc";
  }
}

export async function discoverMovies(
  options: DiscoverOptions = {},
): Promise<TmdbPaginated<TmdbMediaResult>> {
  return tmdbGet("/discover/movie", {
    sort_by: options.sortBy ?? "popularity.desc",
    "primary_release_date.gte": options.dateFrom,
    "primary_release_date.lte": options.dateTo,
    with_genres: options.genreIds,
    "vote_count.gte": options.minVoteCount,
    "vote_average.gte": options.ratingMin,
    "vote_average.lte": options.ratingMax,
    include_adult: "false",
    page: options.page,
  });
}

export async function discoverTv(
  options: DiscoverOptions = {},
): Promise<TmdbPaginated<TmdbMediaResult>> {
  return tmdbGet("/discover/tv", {
    sort_by: options.sortBy ?? "popularity.desc",
    "first_air_date.gte": options.dateFrom,
    "first_air_date.lte": options.dateTo,
    with_genres: options.genreIds,
    "vote_count.gte": options.minVoteCount,
    "vote_average.gte": options.ratingMin,
    "vote_average.lte": options.ratingMax,
    include_adult: "false",
    page: options.page,
  });
}

export async function searchMovies(
  query: string,
  page = 1,
): Promise<TmdbPaginated<TmdbMediaResult>> {
  return tmdbGet("/search/movie", { query, page, include_adult: "false" });
}

export async function searchTv(
  query: string,
  page = 1,
): Promise<TmdbPaginated<TmdbMediaResult>> {
  return tmdbGet("/search/tv", { query, page, include_adult: "false" });
}

/* ------------------------------------------------------------------ */
/* Images                                                              */
/* ------------------------------------------------------------------ */
/* Pure URL builders live in lib/tmdb-image.ts (no server-only deps) so
 * client components can import them; everything below only re-exports. */

export {
  tmdbImageUrl,
  type PosterSize,
  type BackdropSize,
  type LogoSize,
  type TmdbImageSize,
} from "@/lib/tmdb-image";

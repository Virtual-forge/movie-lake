import { slugsFromTmdbGenreIds } from "@/lib/genres";
import {
  tmdbImageUrl,
  type TmdbMediaResult,
  type TmdbMovieDetails,
  type TmdbTvDetails,
  type TmdbWatchProviders,
  type TmdbVideo,
} from "@/lib/api/tmdb";import type { Listing, MediaKind } from "@/types/listing";

/**
 * Normalizes a list of results, skipping unusable entries (no poster/title).
 * Dedicated movie/tv endpoints omit media_type; pass a fallback kind.
 */
export function toListingList(
  results: TmdbMediaResult[] | undefined,
  fallbackKind: "movie" | "tv",
): Listing[] {
  return (results ?? [])
    .map((result) => normalizeMediaResult(result, fallbackKind))
    .filter((listing): listing is Listing => listing !== null);
}

/** "2025-11-07" → 2025 */
function yearFrom(iso?: string): number | undefined {
  if (!iso) return undefined;
  const year = Number.parseInt(iso.slice(0, 4), 10);
  return Number.isFinite(year) ? year : undefined;
}

/** US certification from movie release_dates; "" becomes undefined. */
function movieCertification(details: TmdbMovieDetails): string | undefined {
  const us = details.release_dates?.results?.find((r) => r.iso_3166_1 === "US");
  const certification = us?.release_dates?.find((rd) => rd.certification)?.certification;
  return certification ? certification : undefined;
}

/** US advisory from TV content_ratings. */
function tvCertification(details: TmdbTvDetails): string | undefined {
  const us = details.content_ratings?.results?.find((r) => r.iso_3166_1 === "US");
  return us?.rating || undefined;
}

/**
 * Normalizes a list/preview DTO (trending, discover, search) into a Listing.
 * Dedicated movie/tv endpoints omit media_type, so pass a fallback kind.
 * Returns null when the result is unusable as UI content.
 */
export function normalizeMediaResult(
  result: TmdbMediaResult,
  fallbackKind: "movie" | "tv" = "movie",
): Listing | null {
  const mediaType =
    result.media_type === "tv" || result.media_type === "movie"
      ? result.media_type
      : fallbackKind;
  const kind: MediaKind = mediaType === "tv" ? "series" : "film";
  const title = (result.title ?? result.name)?.trim();
  if (!title || !Number.isFinite(result.id)) return null;
  const poster = tmdbImageUrl(result.poster_path, "w342");
  if (!poster) return null; // a card without artwork is not worth showing

  const backdrop = tmdbImageUrl(result.backdrop_path, "w780");

  return {
    source: "tmdb",
    kind,
    externalId: result.id,
    route: mediaType === "tv" ? `/tv/${result.id}` : `/movie/${result.id}`,
    title,
    year: yearFrom(result.release_date ?? result.first_air_date),
    rating: result.vote_average != null ? result.vote_average : undefined,
    voteCount: result.vote_count,
    genres: slugsFromTmdbGenreIds(result.genre_ids, mediaType),
    poster,
    backdrop,
    thumb: backdrop ? tmdbImageUrl(result.backdrop_path, "w300") : undefined,
    overview: result.overview || undefined,
  };
}

/** Normalizes full movie details, including details-only extras. */
export function normalizeMovieDetails(details: TmdbMovieDetails): Listing | null {
  const title = details.title?.trim();
  const poster = tmdbImageUrl(details.poster_path, "w342");
  if (!title || !Number.isFinite(details.id) || !poster) return null;
  const backdrop = tmdbImageUrl(details.backdrop_path, "w1280");
  return {
    source: "tmdb",
    kind: "film",
    externalId: details.id,
    route: `/movie/${details.id}`,
    title,
    year: yearFrom(details.release_date),
    rating: details.vote_average,
    voteCount: details.vote_count,
    contentRating: movieCertification(details),
    runtimeMin: details.runtime || undefined,
    distributor: details.production_companies?.[0]?.name,
    genres: slugsFromTmdbGenreIds(details.genres, "movie"),
    poster,
    backdrop: backdrop ?? undefined,
    thumb: backdrop ? tmdbImageUrl(details.backdrop_path, "w300") : undefined,
    overview: details.overview || undefined,
  };
}

/** Normalizes full TV details, including details-only extras. */
export function normalizeTvDetails(details: TmdbTvDetails): Listing | null {
  const title = details.name?.trim();
  const poster = tmdbImageUrl(details.poster_path, "w342");
  if (!title || !Number.isFinite(details.id) || !poster) return null;
  const backdrop = tmdbImageUrl(details.backdrop_path, "w1280");
  return {
    source: "tmdb",
    kind: "series",
    externalId: details.id,
    route: `/tv/${details.id}`,
    title,
    year: yearFrom(details.first_air_date),
    rating: details.vote_average,
    voteCount: details.vote_count,
    contentRating: tvCertification(details),
    runtimeMin: details.episode_run_time?.[0] || undefined,
    network: details.networks?.[0]?.name,
    genres: slugsFromTmdbGenreIds(details.genres, "tv"),
    poster,
    backdrop: backdrop ?? undefined,
    thumb: backdrop ? tmdbImageUrl(details.backdrop_path, "w300") : undefined,
    overview: details.overview || undefined,
  };
}

/**
 * YouTube trailer key, preferring official trailers first. Used for the
 * embedded (youtube-nocookie) player on detail pages.
 */
export function pickYouTubeTrailer(
  videos?: { results?: TmdbVideo[] },
): { key: string; name?: string } | null {
  const list = (videos?.results ?? []).filter((v) => v.site === "YouTube");
  const pick =
    list.find((v) => v.type === "Trailer" && v.official) ??
    list.find((v) => v.type === "Trailer") ??
    list.find((v) => v.type === "Teaser") ??
    list[0];
  return pick ? { key: pick.key, name: pick.name || undefined } : null;
}

const WATCH_SLICES = ["flatrate", "rent", "buy"] as const;
export type WatchSliceName = (typeof WATCH_SLICES)[number];

export interface ProviderView {
  name: string;
  logoUrl?: string;
}

export interface WatchRegionView {
  /** Region shown on the site (US today; data comes from JustWatch via TMDB). */
  region: "US";
  /** JustWatch deep link for the "see more" affordance. */
  link?: string;
  slices: Partial<Record<WatchSliceName, ProviderView[]>>;
  /** True when at least one slice has content. */
  hasAny: boolean;
}

/**
 * US watch providers (the site ships US-region data only today), sorted by
 * TMDB display priority and capped per slice so aMeasure panels stay short.
 * Returns null when the title has no US entry at all.
 */
export function watchProvidersView(
  providers?: TmdbWatchProviders,
  sliceCap = 8,
): WatchRegionView | null {
  const us = providers?.results?.US;
  if (!us) return null;

  const slices: WatchRegionView["slices"] = {};
  for (const slice of WATCH_SLICES) {
    const items = us[slice] ?? [];
    const seen = new Set<number>();
    const selected: ProviderView[] = [];
    for (const item of [...items]
      .sort((a, b) => (a.display_priority ?? 999) - (b.display_priority ?? 999))) {
      if (seen.has(item.provider_id)) continue;
      seen.add(item.provider_id);
      if (selected.length >= sliceCap) break;
      selected.push({
        name: item.provider_name ?? "Unknown provider",
        logoUrl: item.logo_path
          ? tmdbImageUrl(item.logo_path, "w92")
          : undefined,
      });
    }
    if (selected.length > 0) slices[slice] = selected;
  }

  const hasAny = Object.keys(slices).length > 0;
  return {
    region: "US",
    hasAny,
    link: us.link || undefined,
    slices,
  };
}

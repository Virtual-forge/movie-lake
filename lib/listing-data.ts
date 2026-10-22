import { cacheLife, cacheTag } from "next/cache";
import {
  discoverMovies,
  discoverTv,
  movieDetails,
  searchMovies,
  searchTv,
  TmdbError,
  tmdbImageUrl,
  tmdbSortBy,
  tvDetails,
  type TmdbCastMember,
  type TmdbMediaResult,
  type TmdbSeason,
  type TmdbSortValue,
} from "@/lib/api/tmdb";
import {
  normalizeMovieDetails,
  normalizeTvDetails,
  pickYouTubeTrailer,
  toListingList,
  watchProvidersView,
  type WatchRegionView,
} from "@/lib/normalize";
import { tmdbGenreParam, tmdbGenreUnionParam } from "@/lib/genres";
import { TMDB_PAGE_LIMIT } from "@/lib/page-params";
import type { AdvancedFilters } from "@/lib/search-filters";
import type { FreeFilmInfo } from "@/lib/free-film";
import type { Listing } from "@/types/listing";

/**
 * Server-side, cached accessors for detail and genre data
 * (docs/PROJECT_PLAN.md: details ~24 h, genre rails ~1 h).
 */

const MOVIE_APPEND = [
  "release_dates",
  "credits",
  "videos",
  "recommendations",
  "external_ids",
  "watch/providers",
] as const;

const TV_APPEND = [
  "content_ratings",
  "credits",
  "videos",
  "recommendations",
  "external_ids",
  "watch/providers",
] as const;

export interface ExternalLink {
  label: string;
  href: string;
}

export interface CastMemberView {
  id: number;
  name: string;
  character?: string;
  profileUrl?: string;
}

export interface SeasonView {
  id: number;
  name: string;
  episodeCount: number;
  year?: number;
  posterUrl?: string;
}

export interface DetailView {
  listing: Listing;
  cast: CastMemberView[];
  related: Listing[];
  /** YouTube trailer for the embedded (youtube-nocookie) dialog player. */
  trailer?: { key: string; name?: string };
  /** US watch providers (JustWatch data via TMDB), or null/undefined when absent. */
  watch?: WatchRegionView | null;
  externalLinks: ExternalLink[];
  /** TV only: ordered season list. */
  seasons?: SeasonView[];
  /**
   * Curated free-film record when this movie has one (watch page + Watch
   * button). Resolved outside the `use cache` boundary so seed edits show
   * immediately; movies only.
   */
  freeFilm?: FreeFilmInfo;
}

function castView(cast?: TmdbCastMember[]): CastMemberView[] {
  return (cast ?? [])
    .filter((member) => member.name)
    .slice(0, 12)
    .map((member) => ({
      id: member.id,
      name: member.name,
      character: member.character || undefined,
      profileUrl: tmdbImageUrl(member.profile_path, "w185"),
    }));
}

function externalLinks(
  imdbId?: string | null,
  kind?: "movie" | "tv",
  id?: number,
): ExternalLink[] {
  const links: ExternalLink[] = [];
  if (imdbId) {
    links.push({ label: "IMDb", href: `https://www.imdb.com/title/${imdbId}/` });
  }
  if (kind && id) {
    links.push({ label: "TMDB", href: `https://www.themoviedb.org/${kind}/${id}` });
  }
  return links;
}

function relatedListings(
  envelope: { results?: TmdbMediaResult[] } | undefined,
  fallbackKind: "movie" | "tv",
): Listing[] {
  return toListingList(envelope?.results, fallbackKind).slice(0, 10);
}

/** Full film detail (certification, cast, trailer, external links). */
export async function getMovieDetail(id: number): Promise<DetailView | null> {
  "use cache";
  cacheLife("days");
  cacheTag(`movie:${id}`);

  let details;
  try {
    details = await movieDetails(id, [...MOVIE_APPEND]);
  } catch (error) {
    // A genuinely missing title is a 404; anything else (rate limit, network)
    // must surface as a real error, not a fake "not found".
    if (error instanceof TmdbError && error.status === 404) return null;
    throw error;
  }
  const listing = normalizeMovieDetails(details);
  if (!listing) return null;

  return {
    listing,
    cast: castView(details.credits?.cast),
    related: relatedListings(details.recommendations, "movie"),
    trailer: pickYouTubeTrailer(details.videos) ?? undefined,
    watch: watchProvidersView(details["watch/providers"]) ?? null,
    externalLinks: externalLinks(details.external_ids?.imdb_id, "movie", details.id),
  };
}

/** Full series detail (advisory, seasons, cast, related). */
export async function getTvDetail(id: number): Promise<DetailView | null> {
  "use cache";
  cacheLife("days");
  cacheTag(`tv:${id}`);

  let details;
  try {
    details = await tvDetails(id, [...TV_APPEND]);
  } catch (error) {
    if (error instanceof TmdbError && error.status === 404) return null;
    throw error;
  }
  const listing = normalizeTvDetails(details);
  if (!listing) return null;

  const seasons: SeasonView[] = (details.seasons ?? [])
    .filter((season) => season.episode_count > 0 && season.name)
    .map((season: TmdbSeason) => ({
      id: season.id,
      name: season.name,
      episodeCount: season.episode_count,
      year: season.air_date ? Number.parseInt(season.air_date.slice(0, 4), 10) || undefined : undefined,
      posterUrl: tmdbImageUrl(season.poster_path, "w342"),
    }));

  return {
    listing,
    cast: castView(details.credits?.cast),
    related: relatedListings(details.recommendations, "tv"),
    trailer: pickYouTubeTrailer(details.videos) ?? undefined,
    watch: watchProvidersView(details["watch/providers"]) ?? null,
    externalLinks: externalLinks(details.external_ids?.imdb_id, "tv", details.id),
    seasons,
  };
}

/** A paginated slice of one canonical genre for one kind. */
export interface GenreKindPage {
  items: Listing[];
  /** TMDB's authoritative page for the response (usually the requested one). */
  page: number;
  /** TMDB total_pages, clamped to the API's own discover ceiling. */
  totalPages: number;
}

function genreKindPage(
  envelope: { page?: number; total_pages?: number; results?: TmdbMediaResult[] },
  requestedPage: number,
  fallbackKind: "movie" | "tv",
): GenreKindPage {
  return {
    items: toListingList(envelope.results, fallbackKind),
    page: envelope.page ?? requestedPage,
    totalPages: Math.min(envelope.total_pages ?? 1, TMDB_PAGE_LIMIT),
  };
}

/** Films of a canonical genre, TMDB page `page` (empty when the kind has no TMDB genre). */
export async function getGenreMoviesPage(
  slug: string,
  page = 1,
): Promise<GenreKindPage> {
  "use cache";
  cacheLife("hours");
  cacheTag(`genre:${slug}:movie`);

  const withGenres = tmdbGenreParam(slug, "movie");
  if (!withGenres) return { items: [], page, totalPages: 0 };
  const envelope = await discoverMovies({
    genreIds: withGenres,
    minVoteCount: 10,
    page,
  });
  return genreKindPage(envelope, page, "movie");
}

/** Series of a canonical genre, TMDB page `page` (empty when the kind has no TMDB genre). */
export async function getGenreSeriesPage(
  slug: string,
  page = 1,
): Promise<GenreKindPage> {
  "use cache";
  cacheLife("hours");
  cacheTag(`genre:${slug}:tv`);

  const withGenres = tmdbGenreParam(slug, "tv");
  if (!withGenres) return { items: [], page, totalPages: 0 };
  const envelope = await discoverTv({
    genreIds: withGenres,
    minVoteCount: 10,
    page,
  });
  return genreKindPage(envelope, page, "tv");
}

/**
 * Advanced search page for one TMDB kind (docs/PROJECT_PLAN.md "Advanced
 * Search"). A non-empty query uses the search endpoint — the source ranks by
 * relevance there and ignores genre/rating/sort params (verified on the live
 * API 2026-10-22). An empty query uses discover, which carries the full
 * filter set: canonical genre union, year range, rating range, sort.
 */
export async function getAdvancedKindPage(
  kind: "movie" | "tv",
  filters: AdvancedFilters,
  page = 1,
): Promise<GenreKindPage> {
  "use cache";
  cacheLife("hours");
  cacheTag(`advanced:${kind}`);

  if (!filters.types.includes(kind)) return { items: [], page, totalPages: 0 };

  if (filters.query !== "") {
    const envelope =
      kind === "movie"
        ? await searchMovies(filters.query, page)
        : await searchTv(filters.query, page);
    return genreKindPage(envelope, page, kind);
  }

  const sortBy: TmdbSortValue =
    filters.sortBy === "relevance" ? "popularity" : filters.sortBy;
  const options = {
    genreIds: tmdbGenreUnionParam(filters.genres, kind),
    dateFrom:
      filters.yearFrom !== undefined ? `${filters.yearFrom}-01-01` : undefined,
    dateTo: filters.yearTo !== undefined ? `${filters.yearTo}-12-31` : undefined,
    ratingMin: filters.ratingMin,
    ratingMax: filters.ratingMax,
    minVoteCount: 10,
    sortBy: tmdbSortBy(sortBy, kind),
    page,
  };
  const envelope =
    kind === "movie" ? await discoverMovies(options) : await discoverTv(options);
  return genreKindPage(envelope, page, kind);
}

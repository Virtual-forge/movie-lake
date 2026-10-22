/**
 * Advanced search URL contract (docs/PROJECT_PLAN.md "Advanced Search").
 * App-level values only — TMDB strings live inside lib/api/tmdb.ts; the URL
 * never carries source-specific params. Pure and shared so the results page,
 * the filter form and pagination links all agree.
 *
 * Verified against the live TMDB API on 2026-10-22:
 * - `/search/movie|tv` honor the keyword (plus at most a single year) but
 *   silently ignore genre, rating-range and sort params.
 * - `/discover/movie|tv` honor genre ("|" = OR union), year range, rating
 *   range and sort, but take no keyword parameter.
 * So a keyword switches the query to source-ranked relevance and lays the
 * discover-only filters aside — and the UI says so (capabilities banner).
 */

import { getGenre } from "@/lib/genres";

export type AdvancedType = "movie" | "tv";
export type AdvancedSort =
  | "relevance"
  | "popularity"
  | "rating"
  | "newest"
  | "title";

const TYPES: AdvancedType[] = ["movie", "tv"];
const SORTS: AdvancedSort[] = [
  "relevance",
  "popularity",
  "rating",
  "newest",
  "title",
];

export const DEFAULT_SORT: AdvancedSort = "popularity";
/** Plausible release windows; anything outside is treated as absent. */
export const YEAR_MIN = 1900;
export const YEAR_MAX = 2100;
export const RATING_MIN = 0;
export const RATING_MAX = 10;

export interface AdvancedFilters {
  /** Selected TMDB types; an empty raw value means both. */
  types: AdvancedType[];
  /** Canonical genre slugs (order preserved, unknown dropped). */
  genres: string[];
  yearFrom?: number;
  yearTo?: number;
  ratingMin?: number;
  ratingMax?: number;
  sortBy: AdvancedSort;
  /** Trimmed keyword; non-empty switches the query to TMDB search ranking. */
  query: string;
}

export const SORT_OPTIONS: Array<{ value: AdvancedSort; label: string }> = [
  { value: "popularity", label: "Most popular" },
  { value: "rating", label: "Top rated" },
  { value: "newest", label: "Newest first" },
  { value: "title", label: "Title (A-Z)" },
  { value: "relevance", label: "Best keyword match" },
];

interface RawParams {
  [key: string]: string | string[] | undefined;
}

function first(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

/**
 * Multi-value params arrive two ways: comma-joined (`genres=action,comedy`,
 * pagination links) or repeated keys (`genres=action&genres=comedy`, native
 * HTML form submits). Both normalize to one flattened list.
 */
function splitValues(raw: string | string[] | undefined): string[] {
  const rawList = Array.isArray(raw) ? raw : raw === undefined ? [] : [raw];
  return rawList
    .flatMap((value) => value.split(","))
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function parseYear(raw: string | string[] | undefined): number | undefined {
  const text = (first(raw) ?? "").trim();
  if (text === "") return undefined;
  const value = Number(text);
  if (!Number.isInteger(value) || value < YEAR_MIN || value > YEAR_MAX) {
    return undefined;
  }
  return value;
}

function parseRating(raw: string | string[] | undefined): number | undefined {
  const text = (first(raw) ?? "").trim();
  if (text === "") return undefined;
  const value = Number(text);
  if (!Number.isFinite(value)) return undefined;
  return Math.min(RATING_MAX, Math.max(RATING_MIN, value));
}

export function parseAdvancedFilters(params: RawParams): AdvancedFilters {
  const query = (first(params.query) ?? "").trim();

  const types = new Set<AdvancedType>();
  for (const value of splitValues(params.types)) {
    if (TYPES.includes(value as AdvancedType)) types.add(value as AdvancedType);
  }

  const genres = splitValues(params.genres).flatMap((slug) =>
    getGenre(slug) ? [slug] : [],
  );

  let yearFrom = parseYear(params.yearFrom);
  let yearTo = parseYear(params.yearTo);
  if (yearFrom !== undefined && yearTo !== undefined && yearFrom > yearTo) {
    [yearFrom, yearTo] = [yearTo, yearFrom];
  }

  let ratingMin = parseRating(params.ratingMin);
  let ratingMax = parseRating(params.ratingMax);
  if (ratingMin !== undefined && ratingMax !== undefined && ratingMin > ratingMax) {
    [ratingMin, ratingMax] = [ratingMax, ratingMin];
  }

  const rawSort = (first(params.sortBy) ?? "").trim();
  let sortBy: AdvancedSort = SORTS.includes(rawSort as AdvancedSort)
    ? (rawSort as AdvancedSort)
    : DEFAULT_SORT;
  // Relevance is a keyword-query ranking; without a keyword it would be a
  // pretence, so it resolves to the default sort instead.
  if (sortBy === "relevance" && query === "") sortBy = DEFAULT_SORT;

  return {
    types: types.size === 0 ? [...TYPES] : TYPES.filter((kind) => types.has(kind)),
    genres: [...new Set(genres)],
    yearFrom,
    yearTo,
    ratingMin,
    ratingMax,
    sortBy,
    query,
  };
}

/** True when a keyword demotes discover-only filters (the banner case). */
export function hasDegradingFilters(filters: AdvancedFilters): boolean {
  if (filters.query === "") return false;
  return (
    filters.genres.length > 0 ||
    filters.yearFrom !== undefined ||
    filters.yearTo !== undefined ||
    filters.ratingMin !== undefined ||
    filters.ratingMax !== undefined ||
    (filters.sortBy !== DEFAULT_SORT && filters.sortBy !== "relevance")
  );
}

/** Canonical query string for a filter set; defaults are omitted. */
export function filtersToSearchParams(filters: AdvancedFilters): string {
  const params = new URLSearchParams();
  if (filters.types.length !== TYPES.length) {
    params.set("types", filters.types.join(","));
  }
  if (filters.genres.length > 0) {
    params.set("genres", filters.genres.join(","));
  }
  if (filters.yearFrom !== undefined) {
    params.set("yearFrom", String(filters.yearFrom));
  }
  if (filters.yearTo !== undefined) {
    params.set("yearTo", String(filters.yearTo));
  }
  if (filters.ratingMin !== undefined) {
    params.set("ratingMin", String(filters.ratingMin));
  }
  if (filters.ratingMax !== undefined) {
    params.set("ratingMax", String(filters.ratingMax));
  }
  if (filters.sortBy !== DEFAULT_SORT) {
    params.set("sortBy", filters.sortBy);
  }
  if (filters.query !== "") {
    params.set("query", filters.query);
  }
  return params.toString();
}

/** Pagination-safe URL for the advanced search at a given page. */
export function advancedHref(filters: AdvancedFilters, page: number): string {
  const query = filtersToSearchParams(filters);
  const base = query === "" ? "/search/advanced" : `/search/advanced?${query}`;
  if (page <= 1) return base;
  return query === "" ? `/search/advanced?page=${page}` : `${base}&page=${page}`;
}

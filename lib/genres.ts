/**
 * Canonical genre taxonomy — the single source of truth for genre URLs,
 * advanced filters (M2) and TMDB discover/detail mapping.
 *
 * Slugs and labels follow docs/PROJECT_PLAN.md ("Canonical Genres"), extended
 * with `musical`. TMDB genre IDs below were resolved against the live
 * `/genre/movie/list` and `/genre/tv/list` responses on 2026-10-21; the
 * many-to-many entries (`10759` Action & Adventure, `10765` Sci-Fi & Fantasy)
 * feed more than one canonical slug, per the plan's mapping rules.
 */

export type GenreSlug =
  | "action"
  | "adventure"
  | "comedy"
  | "crime"
  | "documentary"
  | "drama"
  | "fantasy"
  | "history"
  | "horror"
  | "musical"
  | "mystery"
  | "romance"
  | "science-fiction"
  | "thriller";

export interface GenreDef {
  slug: GenreSlug;
  label: string;
  /** TMDB movie genre ids (union semantics — any one of these matches). */
  movie: number[];
  /** TMDB tv genre ids (union semantics — any one of these matches). */
  tv: number[];
}

export const GENRES: GenreDef[] = [
  { slug: "action", label: "Action", movie: [28], tv: [10759] },
  { slug: "comedy", label: "Comedy", movie: [35], tv: [35] },
  { slug: "history", label: "Historical", movie: [36], tv: [] },
  { slug: "drama", label: "Drama", movie: [18], tv: [18] },
  { slug: "science-fiction", label: "Sci-fi", movie: [878], tv: [10765] },
  { slug: "fantasy", label: "Fantasy", movie: [14], tv: [10765] },
  { slug: "musical", label: "Musical", movie: [10402], tv: [] },
  { slug: "documentary", label: "Documentary", movie: [99], tv: [99] },
  { slug: "adventure", label: "Adventure", movie: [12], tv: [10759] },
  { slug: "crime", label: "Crime", movie: [80], tv: [80] },
  { slug: "mystery", label: "Mystery", movie: [9648], tv: [9648] },
  { slug: "romance", label: "Romance", movie: [10749], tv: [] },
  { slug: "horror", label: "Horror", movie: [27], tv: [] },
  { slug: "thriller", label: "Thriller", movie: [53], tv: [] },
];

export type GenreMap = Record<GenreSlug, GenreDef>;

export const GENRES_BY_SLUG: GenreMap = Object.fromEntries(
  GENRES.map((genre) => [genre.slug, genre]),
) as GenreMap;

export const GENRE_LABELS = Object.fromEntries(
  GENRES.map((genre) => [genre.slug, genre.label]),
) as Record<GenreSlug, string>;

/** Chip order on the homepage (a curated subset of the canonical list). */
export const HOMEPAGE_CHIP_SLUGS: GenreSlug[] = [
  "action",
  "comedy",
  "history",
  "drama",
  "science-fiction",
  "fantasy",
  "musical",
  "documentary",
];

export function getGenre(slug: string): GenreDef | undefined {
  return GENRES_BY_SLUG[slug as GenreSlug];
}

/** `with_genres` value for a canonical slug + TMDB kind. */
export function tmdbGenreParam(
  slug: string,
  kind: "movie" | "tv",
): string | undefined {
  const genre = getGenre(slug);
  if (!genre) return undefined;
  const ids = kind === "movie" ? genre.movie : genre.tv;
  return ids.length > 0 ? ids.join(",") : undefined;
}

/**
 * OR-union for advanced-search multi-select: ids across several canonical
 * slugs joined with TMDB's pipe semantics ("any of these match"), de-duped.
 */
export function tmdbGenreUnionParam(
  slugs: string[],
  kind: "movie" | "tv",
): string | undefined {
  const ids = new Set<number>();
  for (const slug of slugs) {
    const genre = getGenre(slug);
    if (genre) for (const id of kind === "movie" ? genre.movie : genre.tv) ids.add(id);
  }
  return ids.size > 0 ? [...ids].join("|") : undefined;
}

interface TmdbGenreLike {
  id: number;
}

/**
 * Reverse mapping: a result's raw genre id list → canonical slugs.
 * Many-to-many, per the plan (10759 → action + adventure, 10765 → sci-fi + fantasy).
 */
export function slugsFromTmdbGenreIds(
  ids: TmdbGenreLike[] | number[] | undefined,
  kind: "movie" | "tv",
): GenreSlug[] {
  if (!ids?.length) return [];
  const sources =
    kind === "movie"
      ? GENRES.flatMap((g) => g.movie.map((id) => [id, g.slug] as const))
      : GENRES.flatMap((g) => g.tv.map((id) => [id, g.slug] as const));
  const idToSlugs = new Map<number, GenreSlug[]>();
  for (const [id, slug] of sources) {
    const list = idToSlugs.get(id) ?? [];
    list.push(slug);
    idToSlugs.set(id, list);
  }
  return ids
    .flatMap((id) => idToSlugs.get(typeof id === "number" ? id : id.id) ?? [])
    .filter((slug, index, all) => all.indexOf(slug) === index);
}

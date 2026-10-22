/**
 * Pure TMDB image URL builders. Kept free of `lib/api/tmdb.ts` so client
 * components (which cannot touch the server-only TMDB client/env module)
 * can rebuild full URLs from stored poster paths.
 */

export type PosterSize = "w185" | "w342" | "w500" | "original";
export type BackdropSize = "w300" | "w780" | "w1280" | "original";
/** Provider logo sizes (small square art under /t/p/). */
export type LogoSize = "w45" | "w92" | "w154" | "w300" | "original";
export type TmdbImageSize = PosterSize | BackdropSize | LogoSize;

export function tmdbImageUrl(
  path?: string | null,
  size: TmdbImageSize = "w342",
): string | undefined {
  if (!path) return undefined;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

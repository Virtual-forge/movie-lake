/**
 * Page parsing for list routes (genre pages today, search filters later).
 * Pure and shared — TMDB caps discover pages at 500, and anything invalid
 * falls back to the first page instead of erroring.
 */

export const TMDB_PAGE_LIMIT = 500;

export function parsePageParam(
  raw: string | string[] | undefined,
  limit: number = TMDB_PAGE_LIMIT,
): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number(value ?? "");
  if (!Number.isInteger(parsed) || parsed < 1) return 1;
  return Math.min(parsed, limit);
}

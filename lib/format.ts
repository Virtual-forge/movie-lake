/** Small pure formatters shared by rails, cards and detail pages. */

export function formatRuntime(min?: number): string | undefined {
  if (!min) return undefined;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

export function formatRating(rating?: number): string | undefined {
  return rating === undefined ? undefined : rating.toFixed(1);
}

import { Star } from "lucide-react";
import { formatRating } from "@/lib/format";
import { GENRE_LABELS } from "@/lib/genres";
import type { Listing } from "@/types/listing";

interface MetaRowProps {
  item: Listing;
  /** Show the genre instead of the network/distributor chip. */
  showGenre?: boolean;
  className?: string;
}

/**
 * The tiny metadata row used under posters and next to thumbnails:
 * star rating, one quiet chip, then the media chip.
 */
export function MetaRow({ item, showGenre = false, className }: MetaRowProps) {
  const rating = formatRating(item.rating);
  const chip = showGenre
    ? (GENRE_LABELS[item.genres[0]] ?? undefined)
    : (item.network ??
      item.distributor ??
      (item.genres.length > 0 ? GENRE_LABELS[item.genres[0]] : undefined));

  return (
    <div className={`flex items-center gap-1.5 text-content-muted ${className ?? ""}`}>
      {rating !== undefined && (
        <span className="flex items-center gap-1 text-content-secondary">
          <Star aria-hidden className="size-3 fill-current" />
          <span className="font-medium tabular-nums">{rating}</span>
          <span className="sr-only">/ 10 rating</span>
        </span>
      )}
      {chip !== undefined && (
        <span className="rounded-[4px] border border-border/70 px-1 py-px text-[10px] leading-none">
          {chip}
        </span>
      )}
      <span className="rounded-[4px] border border-border/70 px-1 py-px text-[10px] uppercase leading-none">
        {item.kind === "film" ? "Film" : "Series"}
      </span>
    </div>
  );
}

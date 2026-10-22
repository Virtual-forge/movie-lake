import Image from "next/image";
import type { SeasonView } from "@/lib/listing-data";
import { DragScroller } from "@/components/drag-scroller";

/** Season posters row for series detail pages. */
export function SeasonList({ seasons }: { seasons: SeasonView[] }) {
  return (
    <div className="flex flex-col">
      <h2 className="text-2xl font-semibold tracking-tight text-content">Seasons</h2>
      <DragScroller className="-mx-1 mt-4 flex gap-4 overflow-x-auto px-1 pb-2 scrollbar-none">
        {seasons.map((season) => (
          <li key={season.id} className="w-40 shrink-0">
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-surface ring-1 ring-border/50">
              {season.posterUrl ? (
                <Image
                  src={season.posterUrl}
                  alt={`${season.name} poster`}
                  fill
                  sizes="160px"
                  className="object-cover"
                />
              ) : null}
            </div>
            <p className="mt-2 truncate text-[13px] font-medium text-content">
              {season.name}
            </p>
            <p className="truncate text-[12px] text-content-muted">
              {season.episodeCount} episode{season.episodeCount === 1 ? "" : "s"}
              {season.year ? ` - ${season.year}` : ""}
            </p>
          </li>
        ))}
      </DragScroller>
    </div>
  );
}

import Link from "next/link";
import {
  Clapperboard,
  Compass,
  Drama,
  Fingerprint,
  Ghost,
  Heart,
  Landmark,
  Laugh,
  Music,
  Search,
  Sparkles,
  Swords,
  WandSparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { GENRES_BY_SLUG, HOMEPAGE_CHIP_SLUGS, type GenreSlug } from "@/lib/genres";
import { DragScroller } from "@/components/drag-scroller";

const GENRE_ICONS: Record<GenreSlug, LucideIcon> = {
  action: Swords,
  adventure: Compass,
  comedy: Laugh,
  crime: Fingerprint,
  documentary: Clapperboard,
  drama: Drama,
  fantasy: WandSparkles,
  history: Landmark,
  horror: Ghost,
  musical: Music,
  mystery: Search,
  romance: Heart,
  "science-fiction": Sparkles,
  thriller: Zap,
};

/** Homepage chips — the curated reference subset in reference order. */
export function GenreRow() {
  return (
    <section aria-label="Find by genre" className="flex items-center gap-4">
      <h2 className="hidden shrink-0 text-[12px] leading-snug text-content-muted sm:block">
        Find by
        <span className="block">genre</span>
      </h2>
      <DragScroller className="-mx-1 flex min-w-0 flex-1 gap-2.5 overflow-x-auto px-1 py-1 scrollbar-none">
        {HOMEPAGE_CHIP_SLUGS.map((slug) => {
          const genre = GENRES_BY_SLUG[slug];
          const Icon = GENRE_ICONS[genre.slug];
          return (
            <li key={genre.slug} className="shrink-0">
              <Link
                href={`/genres/${genre.slug}`}
                className="flex h-9 items-center gap-2 whitespace-nowrap rounded-full border border-border bg-surface px-4 text-[13px] text-content transition-colors hover:border-[#48443f] hover:bg-surface-elevated"
              >
                <Icon aria-hidden className="size-3.5" />
                {genre.label}
              </Link>
            </li>
          );
        })}
      </DragScroller>
    </section>
  );
}

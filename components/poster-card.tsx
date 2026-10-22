import Image from "next/image";
import Link from "next/link";
import type { Listing } from "@/types/listing";
import { MetaRow } from "@/components/meta-row";

/**
 * Poster-first card used in rails and grids. No enclosing panel — the
 * artwork is the card, metadata sits quietly beneath it.
 *
 * `eager` marks above-the-fold cards so their posters don't pay lazy-load
 * cost while being the page's Largest Contentful Paint.
 */
export function PosterCard({ item, eager }: { item: Listing; eager?: boolean }) {
  return (
    <Link
      href={item.route}
      // Default prefetch: App Router prefetches on viewport entry, which under
      // partialPrefetching streams the partial shell for detail routes.
      className="group block min-w-0 scroll-ml-4 snap-start"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-surface ring-1 ring-transparent transition-[box-shadow] group-hover:ring-1 group-hover:ring-white/20">
        <Image
          src={item.poster}
          alt={`${item.title} poster`}
          fill
          sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 200px"
          loading={eager ? "eager" : undefined}
          fetchPriority={eager ? "high" : undefined}
          className="object-cover transition-transform duration-200 ease-out group-hover:scale-[1.02]"
        />
      </div>
      <MetaRow item={item} className="mt-2.5" />
      <h3 className="mt-1 line-clamp-2 text-[14px] leading-snug text-content transition-colors group-hover:text-white">
        {item.title}
      </h3>
    </Link>
  );
}

import { Suspense } from "react";
import type { Metadata } from "next";
import { SearchClient, type KindTab } from "@/components/search-client";
import { PosterGridSkeleton } from "@/components/poster-grid-skeleton";

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false },
};

type SearchParams = Promise<{ q?: string; kind?: string }>;

/**
 * Instant shell: heading region only arrives in the layout; everything else
 * streams once searchParams are known (cacheComponents rule).
 */
export default function SearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <div className="mx-auto w-full max-w-[1600px] px-5 py-8 md:px-10 md:py-10 lg:px-14">
      <h1 className="sr-only">Search films and series</h1>
      <Suspense fallback={<PosterGridSkeleton count={14} />}>
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function SearchResults({ searchParams }: { searchParams: SearchParams }) {
  const { q, kind } = await searchParams;
  const initialKind: KindTab = kind === "movie" || kind === "tv" ? kind : "all";
  return <SearchClient initialQuery={q?.trim() ?? ""} initialKind={initialKind} />;
}

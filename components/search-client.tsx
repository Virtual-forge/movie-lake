"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PosterCard } from "@/components/poster-card";
import { PosterGridSkeleton } from "@/components/poster-grid-skeleton";
import type { Listing } from "@/types/listing";

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

export type KindTab = "all" | "movie" | "tv";

interface KindResult {
  status: "ok" | "error";
  page: number;
  totalPages: number;
  total: number;
  listings: Listing[];
  error?: "tmdb_unavailable";
}

interface SearchResponse {
  query: string;
  kinds: {
    movie: KindResult | null;
    tv: KindResult | null;
  };
}

interface SearchClientProps {
  initialQuery: string;
  initialKind: KindTab;
}

async function fetchKind(
  target: "movie" | "tv",
  query: string,
  page: number,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: query, kind: target, page: String(page) });
  const response = await fetch(`/api/search?${params}`, { signal });
  if (!response.ok) throw new Error(`Search failed (${response.status})`);
  return (await response.json()) as SearchResponse;
}

export function SearchClient({ initialQuery, initialKind }: SearchClientProps) {
  const [input, setInput] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [kind, setKind] = useState<KindTab>(initialKind);
  const [pages, setPages] = useState({ movie: 1, tv: 1 });

  // refine after a short settle, min 2 chars (PROJECT_PLAN M1)
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(input.trim()), DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [input]);

  // keep the URL shareable without a server round-trip
  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (kind !== "all") params.set("kind", kind);
    const search = params.toString();
    window.history.replaceState(null, "", `/search${search ? `?${search}` : ""}`);
  }, [query, kind]);

  const movieQuery = useQuery({
    queryKey: ["search", "movie", query, pages.movie],
    queryFn: ({ signal }) => fetchKind("movie", query, pages.movie, signal),
    enabled: query.length >= MIN_QUERY_LENGTH && kind !== "tv",
  });

  const tvQuery = useQuery({
    queryKey: ["search", "tv", query, pages.tv],
    queryFn: ({ signal }) => fetchKind("tv", query, pages.tv, signal),
    enabled: query.length >= MIN_QUERY_LENGTH && kind !== "movie",
  });

  function gotoPage(target: "movie" | "tv", page: number) {
    setPages((current) => ({ ...current, [target]: Math.max(1, page) }));
    window.scrollTo({ top: 0 });
  }

  const tabs: Array<{ key: KindTab; label: string }> = [
    { key: "all", label: "All" },
    { key: "movie", label: "Films" },
    { key: "tv", label: "Series" },
  ];

  const showMovies = kind !== "tv";
  const showSeries = kind !== "movie";

  const visibleResults = [
    showMovies ? movieQuery : null,
    showSeries ? tvQuery : null,
  ].filter((q): q is NonNullable<typeof q> => q !== null);

  // Kinds that finished loading (queried kind or both when "All" is active).
  const ended = visibleResults.flatMap((q) =>
    q.status === "success" && q.data?.kinds
      ? Object.values(q.data.kinds).filter((r): r is KindResult => r !== null)
      : [],
  );
  const totalTitles = ended.reduce((sum, r) => sum + (r.total ?? 0), 0);
  const listingCount = ended.reduce((sum, r) => sum + r.listings.length, 0);
  const fullyLoaded = visibleResults.length > 0 && visibleResults.every((q) => q.status === "success");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-[clamp(1.5rem,2.6vw,2.2rem)] font-semibold tracking-tight text-content">
          {query.length >= MIN_QUERY_LENGTH ? `Results for "${query}"` : "Search"}
        </p>
        <p className="text-[13px] text-content-muted" aria-live="polite">
          {query.length >= MIN_QUERY_LENGTH
            ? movieQuery.isFetching || tvQuery.isFetching
              ? "Searching..."
              : `${totalTitles} title${totalTitles === 1 ? "" : "s"}`
            : "Type at least 2 characters"}
        </p>
      </div>

      {/* Query control */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Search films and series"
          aria-label="Search films and series"
          autoComplete="off"
          spellCheck={false}
          className="h-11 w-full max-w-md rounded-full border border-border bg-surface px-5 text-[15px] text-content placeholder:text-content-muted focus:border-[#48443f] focus:outline-none"
        />
        <ul className="flex gap-2" role="tablist" aria-label="Filter results by kind">
          {tabs.map((tab) => (
            <li key={tab.key}>
              <button
                type="button"
                role="tab"
                aria-selected={kind === tab.key}
                onClick={() => {
                  setKind(tab.key);
                  window.scrollTo({ top: 0 });
                }}
                className={`h-9 rounded-full border px-4 text-[13px] transition-colors ${
                  kind === tab.key
                    ? "border-transparent bg-content text-background"
                    : "border-border bg-surface text-content hover:border-[#48443f]"
                }`}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {query.length < MIN_QUERY_LENGTH ? (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-surface px-6 py-10">
          <p className="text-content">Search films and series by title, network or actor credits.</p>
          <Link
            href="/"
            className="text-[13px] font-medium text-content-secondary underline-offset-4 transition-colors hover:text-content hover:underline"
          >
            Back to Discover
          </Link>
        </div>
      ) : fullyLoaded && listingCount === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-surface px-6 py-10">
          <p className="text-content">
            {`Nothing matched "${query}" - try fewer or different words.`}
          </p>
          <Link
            href="/"
            className="text-[13px] font-medium text-content-secondary underline-offset-4 transition-colors hover:text-content hover:underline"
          >
            Back to Discover
          </Link>
        </div>
      ) : null}

      {showMovies && (
        <KindSection
          ariaLabel="Film results"
          heading="Films"
          query={query}
          page={pages.movie}
          state={movieQuery.status}
          result={kind === "movie" || kind === "all" ? (movieQuery.data?.kinds.movie ?? null) : null}
          isFetching={movieQuery.isFetching}
          onPage={(next) => {
            gotoPage("movie", next);
          }}
          onRetry={() => void movieQuery.refetch()}
        />
      )}

      {showSeries && (
        <KindSection
          ariaLabel="Series results"
          heading="Series"
          query={query}
          page={pages.tv}
          state={tvQuery.status}
          result={kind === "tv" || kind === "all" ? (tvQuery.data?.kinds.tv ?? null) : null}
          isFetching={tvQuery.isFetching}
          onPage={(next) => {
            gotoPage("tv", next);
          }}
          onRetry={() => void tvQuery.refetch()}
        />
      )}
    </div>
  );
}

interface KindSectionProps {
  ariaLabel: string;
  heading: string;
  query: string;
  page: number;
  state: "pending" | "error" | "success";
  result: KindResult | null;
  isFetching: boolean;
  onPage: (next: number) => void;
  onRetry: () => void;
}

function KindSection({
  ariaLabel,
  heading,
  query,
  page,
  state,
  result,
  isFetching,
  onPage,
  onRetry,
}: KindSectionProps) {
  const total = result?.total ?? 0;
  const listings = result?.listings ?? [];

  return (
    <section aria-label={ariaLabel} className="flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight text-content">{heading}</h2>
        {result?.status === "ok" && listings.length > 0 && (
          <p className="text-[13px] text-content-muted">
            {total} title{total === 1 ? "" : "s"}
          </p>
        )}
      </div>

      {state === "pending" ? (
        <PosterGridSkeleton />
      ) : result?.status === "error" ? (
        <ErrorCard onRetry={onRetry} />
      ) : listings.length === 0 ? (
        <p className="text-[13px] text-content-muted">
          {`No films found for "${query}"`}
        </p>
      ) : (
        <>
          {isFetching && <p className="sr-only">Updating {heading.toLowerCase()}...</p>}
          <ul
            key={`${page}-${isFetching}`}
            className={`grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 transition-opacity ${
              isFetching ? "pointer-events-none opacity-50" : ""
            }`}
          >
            {listings.map((item, index) => (
              <li key={item.route} className="min-w-0">
                <PosterCard item={item} eager={index < 7} />
              </li>
            ))}
          </ul>
          {(result?.totalPages ?? 0) > 1 && (
            <nav aria-label={`${heading} pagination`} className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => onPage(page - 1)}
                disabled={page <= 1 || isFetching}
                className="h-9 rounded-full border border-border px-4 text-[13px] text-content-secondary transition-colors hover:border-[#48443f] hover:text-content disabled:cursor-default disabled:opacity-40 disabled:hover:border-border disabled:hover:text-content-secondary"
              >
                Previous
              </button>
              <p className="text-[13px] text-content-muted">
                Page {page} of {result?.totalPages ?? 1}
              </p>
              <button
                type="button"
                onClick={() => onPage(page + 1)}
                disabled={page >= (result?.totalPages ?? 1) || isFetching}
                className="h-9 rounded-full border border-border px-4 text-[13px] text-content-secondary transition-colors hover:border-[#48443f] hover:text-content disabled:cursor-default disabled:opacity-40 disabled:hover:border-border disabled:hover:text-content-secondary"
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}

function ErrorCard({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-6 py-6"
    >
      <p className="text-content">
        Those results are unavailable right now. TMDB may be down or rate limiting.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="h-9 rounded-full border border-border px-4 text-[13px] text-content-secondary transition-colors hover:border-[#48443f] hover:text-content"
      >
        Retry
      </button>
    </div>
  );
}

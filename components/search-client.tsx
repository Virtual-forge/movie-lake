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
  // The kind is owned by the URL (URL-param tabs): the server re-renders
  // on tab navigation and `key` in the page remounts this component from
  // fresh props, so client state can never drift from the URL.
  const kind: KindTab = initialKind;
  const [pages, setPages] = useState({ movie: 1, tv: 1 });

  /** Short or empty query = browse mode (discovery feed, M8). */
  const browsing = query.length < MIN_QUERY_LENGTH;

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
    enabled: kind !== "tv",
  });

  const tvQuery = useQuery({
    queryKey: ["search", "tv", query, pages.tv],
    queryFn: ({ signal }) => fetchKind("tv", query, pages.tv, signal),
    enabled: kind !== "movie",
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

  /**
   * Kind tabs are URL-param links (the genre-page pattern, M8): navigation
   * re-renders from the server with the new kind, the URL stays
   * shareable, and the client state can never drift from it — the old
   * state-button tabs desynced from the URL when the header links
   * navigated.
   */
  function tabHref(key: KindTab): string {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (key !== "all") params.set("kind", key);
    const search = params.toString();
    return search ? `/search?${search}` : "/search";
  }

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
          {browsing ? "Browse films & series" : `Results for "${query}"`}
        </p>
        <p className="text-[13px] text-content-muted" aria-live="polite">
          {movieQuery.isFetching || tvQuery.isFetching
            ? browsing
              ? "Loading the discovery feed..."
              : "Searching..."
            : `${totalTitles} title${totalTitles === 1 ? "" : "s"}`}
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
        <ul aria-label="Filter results by kind" className="flex gap-2">
          {tabs.map((tab) => (
            <li key={tab.key}>
              <Link
                href={tabHref(tab.key)}
                aria-current={kind === tab.key ? "true" : undefined}
                className={`inline-flex h-9 items-center rounded-full border px-4 text-[13px] transition-colors ${
                  kind === tab.key
                    ? "border-transparent bg-content text-background"
                    : "border-border bg-surface text-content hover:border-[#48443f]"
                }`}
              >
                {tab.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {browsing ? null : fullyLoaded && listingCount === 0 ? (
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
          browse={browsing}
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
          browse={browsing}
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
  /** Browse mode (empty/short query): the zero-results copy differs. */
  browse?: boolean;
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
  browse = false,
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
          {browse
            ? "Nothing to browse here yet — the discovery feed came back empty, try again shortly."
            : `No films found for "${query}"`}
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

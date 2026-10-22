import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { GENRES } from "@/lib/genres";
import { getAdvancedKindPage, type GenreKindPage } from "@/lib/listing-data";
import { parsePageParam } from "@/lib/page-params";
import {
  advancedHref,
  hasDegradingFilters,
  parseAdvancedFilters,
  RATING_MAX,
  RATING_MIN,
  SORT_OPTIONS,
  YEAR_MAX,
  YEAR_MIN,
  type AdvancedFilters,
} from "@/lib/search-filters";
import { PosterCard } from "@/components/poster-card";
import { PosterGridSkeleton } from "@/components/poster-grid-skeleton";
import { PaginationNav } from "@/components/pagination-nav";

/**
 * Advanced search (docs/PROJECT_PLAN.md "Advanced Search"). The filter state
 * lives in the URL; the form is a plain HTML GET form so every filter set is
 * a shareable URL and the page works without JavaScript. Results stream
 * per TMDB kind (cacheComponents: searchParams reads inside Suspense).
 */
export const metadata: Metadata = {
  title: "Advanced search",
  robots: { index: false },
};

type AdvancedSearchParams = Promise<{
  types?: string;
  genres?: string;
  yearFrom?: string;
  yearTo?: string;
  ratingMin?: string;
  ratingMax?: string;
  sortBy?: string;
  query?: string;
  page?: string;
}>;

export default function AdvancedSearchPage({
  searchParams,
}: {
  searchParams: AdvancedSearchParams;
}) {
  return (
    <div className="mx-auto w-full max-w-[1600px] px-5 py-8 md:px-10 md:py-10 lg:px-14">
      <h1 className="text-[clamp(1.5rem,2.6vw,2.2rem)] font-semibold tracking-tight text-content">
        Advanced search
      </h1>
      <Suspense fallback={<AdvancedSkeleton />}>
        <AdvancedResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function AdvancedSkeleton() {
  return (
    <div aria-hidden className="mt-6 flex flex-col gap-6">
      <div className="h-48 animate-pulse rounded-2xl bg-surface" />
      <PosterGridSkeleton count={14} />
    </div>
  );
}

async function AdvancedResults({
  searchParams,
}: {
  searchParams: AdvancedSearchParams;
}) {
  const raw = await searchParams;
  const filters = parseAdvancedFilters(raw);
  const page = parsePageParam(raw.page);
  const keywordMode = filters.query !== "";

  const [films, series] = await Promise.all([
    getAdvancedKindPage("movie", filters, page),
    getAdvancedKindPage("tv", filters, page),
  ]);

  const activeTotalPages = filters.types.flatMap((kind) =>
    kind === "movie" ? [films.totalPages] : [series.totalPages],
  );
  const navTotalPages =
    activeTotalPages.length > 0 ? Math.min(...activeTotalPages) : 0;

  return (
    <>
      <FilterForm filters={filters} />

      {hasDegradingFilters(filters) && (
        <p
          role="note"
          className="mt-4 rounded-xl border border-border bg-surface px-5 py-3 text-[13px] text-content-secondary"
        >
          Keyword results are ranked by TMDB&apos;s own relevance — the genre,
          year, rating and sort filters only apply once the keyword is cleared.
        </p>
      )}

      {filters.types.includes("movie") && (
        <KindResultSection
          kind="movie"
          heading="Films"
          data={films}
          keywordMode={keywordMode}
          page={page}
          query={filters.query}
        />
      )}
      {filters.types.includes("tv") && (
        <KindResultSection
          kind="tv"
          heading="Series"
          data={series}
          keywordMode={keywordMode}
          page={page}
          query={filters.query}
        />
      )}

      {navTotalPages > 1 && (
        <PaginationNav
          page={page}
          totalPages={navTotalPages}
          hrefFor={(next) => advancedHref(filters, next)}
          label="Advanced search pagination"
        />
      )}
    </>
  );
}

const LEGEND_CLASS =
  "block text-[12px] font-semibold uppercase tracking-[0.14em] text-content-secondary";
const INPUT_CLASS =
  "h-9 rounded-lg border border-border bg-background px-2.5 text-[14px] text-content focus:border-[#48443f] focus:outline-none";
const CHIP_SPAN_CLASS =
  "inline-flex h-9 cursor-pointer items-center rounded-full border border-border bg-background px-4 text-[13px] text-content transition-colors hover:border-[#48443f] peer-checked:border-transparent peer-checked:bg-content peer-checked:text-background";
const CHIP_SPAN_COMPACT_CLASS =
  "inline-flex h-8 cursor-pointer items-center rounded-full border border-border bg-background px-3 text-[12px] text-content transition-colors hover:border-[#48443f] peer-checked:border-transparent peer-checked:bg-content peer-checked:text-background";

/**
 * Plain HTML GET form: no client state, every submit produces the same URL
 * contract the results above parse. Unchecked types reload with no types
 * param, which the parser resolves back to "both" (stated in the legend).
 */
function FilterForm({ filters }: { filters: AdvancedFilters }) {
  return (
    <form
      method="get"
      action="/search/advanced"
      className="mt-6 flex flex-col gap-5 rounded-2xl border border-border bg-surface px-5 py-5 md:px-7 md:py-6"
    >
      <div>
        <label htmlFor="advanced-query" className={LEGEND_CLASS}>
          Keyword
        </label>
        <input
          id="advanced-query"
          type="search"
          name="query"
          defaultValue={filters.query}
          placeholder="e.g. nosferatu, heist, singin"
          className={`mt-2 h-10 w-full max-w-md px-3 text-[14px] ${INPUT_CLASS}`}
        />
        <p className="mt-1.5 text-[12px] text-content-muted">
          A keyword switches the results to source-ranked relevance; the other
          filters apply to keyword-free browsing.
        </p>
      </div>

      <fieldset>
        <legend className={LEGEND_CLASS}>
          Type{" "}
          <span className="font-normal normal-case tracking-normal text-content-muted">
            — none picked shows both
          </span>
        </legend>
        <div className="mt-2 flex gap-2">
          {(
            [
              { value: "movie", label: "Films" },
              { value: "tv", label: "Series" },
            ] as const
          ).map((option) => (
            <label key={option.value}>
              <input
                type="checkbox"
                name="types"
                value={option.value}
                defaultChecked={filters.types.includes(option.value)}
                className="peer sr-only"
              />
              <span className={CHIP_SPAN_CLASS}>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className={LEGEND_CLASS}>Genres</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {GENRES.map((genre) => (
            <label key={genre.slug}>
              <input
                type="checkbox"
                name="genres"
                value={genre.slug}
                defaultChecked={filters.genres.includes(genre.slug)}
                className="peer sr-only"
              />
              <span className={CHIP_SPAN_COMPACT_CLASS}>{genre.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-end gap-6">
        <fieldset>
          <legend className={LEGEND_CLASS}>Year</legend>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              name="yearFrom"
              min={YEAR_MIN}
              max={YEAR_MAX}
              defaultValue={filters.yearFrom ?? ""}
              placeholder={String(YEAR_MIN)}
              aria-label="Year from"
              className={`w-24 ${INPUT_CLASS}`}
            />
            <span aria-hidden className="text-content-muted">
              –
            </span>
            <input
              type="number"
              name="yearTo"
              min={YEAR_MIN}
              max={YEAR_MAX}
              defaultValue={filters.yearTo ?? ""}
              placeholder={String(YEAR_MAX)}
              aria-label="Year to"
              className={`w-24 ${INPUT_CLASS}`}
            />
          </div>
        </fieldset>

        <fieldset>
          <legend className={LEGEND_CLASS}>Rating</legend>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              name="ratingMin"
              min={RATING_MIN}
              max={RATING_MAX}
              step={0.5}
              defaultValue={filters.ratingMin ?? ""}
              placeholder={String(RATING_MIN)}
              aria-label="Minimum rating"
              className={`w-24 ${INPUT_CLASS}`}
            />
            <span aria-hidden className="text-content-muted">
              –
            </span>
            <input
              type="number"
              name="ratingMax"
              min={RATING_MIN}
              max={RATING_MAX}
              step={0.5}
              defaultValue={filters.ratingMax ?? ""}
              placeholder={String(RATING_MAX)}
              aria-label="Maximum rating"
              className={`w-24 ${INPUT_CLASS}`}
            />
          </div>
        </fieldset>

        <fieldset>
          <legend className={LEGEND_CLASS}>Sort by</legend>
          <select
            name="sortBy"
            defaultValue={filters.sortBy}
            aria-label="Sort results by"
            className={`mt-2 h-9 text-[13px] ${INPUT_CLASS}`}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </fieldset>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          className="inline-flex h-9 items-center rounded-full bg-content px-5 text-[13px] font-medium text-background transition-opacity hover:opacity-85"
        >
          Apply filters
        </button>
        <Link
          href="/search/advanced"
          className="text-[13px] text-content-secondary underline-offset-4 transition-colors hover:text-content hover:underline"
        >
          Reset
        </Link>
      </div>
    </form>
  );
}

function KindResultSection({
  kind,
  heading,
  data,
  keywordMode,
  page,
  query,
}: {
  kind: "movie" | "tv";
  heading: string;
  data: GenreKindPage;
  keywordMode: boolean;
  page: number;
  query: string;
}) {
  const noun = kind === "movie" ? "films" : "series";
  const label = kind === "movie" ? "Film results" : "Series results";

  let body: ReactNode;
  if (data.items.length === 0) {
    const message =
      !keywordMode && page > 1 && data.totalPages > 0
        ? `No ${noun} are listed on page ${page} of this filter — try an earlier page.`
        : keywordMode
          ? `No ${noun} matched the keyword "${query}".`
          : `No ${noun} matched these filters yet — try widening the year or rating range.`;
    body = (
      <div className="rounded-2xl border border-border bg-surface px-6 py-10 text-content">
        {message}
      </div>
    );
  } else {
    body = (
      <ul className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7">
        {data.items.map((item, index) => (
          <li key={item.route} className="min-w-0">
            <PosterCard item={item} eager={index < 7} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section aria-label={label} className="mt-10 flex flex-col">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-2xl font-semibold tracking-tight text-content">
          {heading}
        </h2>
        {data.items.length > 0 && data.totalPages > 0 && (
          <p className="text-[13px] text-content-muted">
            Page {data.page} of {data.totalPages}
          </p>
        )}
      </div>
      {body}
    </section>
  );
}

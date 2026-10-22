import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";
import { GENRES, getGenre, type GenreDef } from "@/lib/genres";
import { getGenreMoviesPage, getGenreSeriesPage } from "@/lib/listing-data";
import { genreSeo } from "@/lib/seo";
import { parsePageParam } from "@/lib/page-params";
import { PosterCard } from "@/components/poster-card";
import { PosterGridSkeleton } from "@/components/poster-grid-skeleton";
import { PaginationNav } from "@/components/pagination-nav";
import type { Listing } from "@/types/listing";

export function generateStaticParams() {
  return GENRES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const genre = getGenre(slug);
  if (!genre) return {};
  return genreSeo(genre);
}

type GenreKind = "movie" | "tv";
type GenreView = GenreKind | "all";
type GenreSearchParams = Promise<{ kind?: string; page?: string }>;

/**
 * Instant shell = heading skeleton; the kind/page state lives in the URL and
 * streams in through `use cache` discover pages (pagination per kind; the
 * combined "all" view keeps the un-paged top of the genre — cacheComponents
 * requires searchParams reads inside Suspense).
 */
export default function GenrePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: GenreSearchParams;
}) {
  return (
    <Suspense fallback={<GenreSkeleton />}>
      <GenreDetails params={params} searchParams={searchParams} />
    </Suspense>
  );
}

function GenreSkeleton() {
  return (
    <div
      aria-hidden
      className="mx-auto w-full max-w-[1600px] px-5 py-8 md:px-10 md:py-10 lg:px-14"
    >
      <div className="h-9 w-1/4 animate-pulse rounded-lg bg-surface" />
      <div className="mt-8">
        <PosterGridSkeleton count={14} />
      </div>
    </div>
  );
}

/** One TMDB kind looks up cleanly; anything else is the combined "all" view. */
function viewKind(raw: string | undefined): GenreView {
  return raw === "movie" || raw === "tv" ? raw : "all";
}

function KindTabs({
  slug,
  active,
  genre,
}: {
  slug: string;
  active: GenreView;
  genre: GenreDef;
}) {
  const tabs = [
    { key: "all" as GenreView, label: "All", visible: true },
    { key: "movie" as GenreView, label: "Films", visible: genre.movie.length > 0 },
    { key: "tv" as GenreView, label: "Series", visible: genre.tv.length > 0 },
  ];

  return (
    <nav
      aria-label={`Browse ${genre.label} by type`}
      className="mt-4 flex gap-2"
    >
      {tabs
        .filter((tab) => tab.visible)
        .map((tab) => (
          <Link
            key={tab.key}
            href={
              tab.key === "all"
                ? `/genres/${slug}`
                : `/genres/${slug}?kind=${tab.key}`
            }
            aria-current={active === tab.key ? "true" : undefined}
            className={`h-9 inline-flex items-center rounded-full border px-4 text-[13px] transition-colors ${
              active === tab.key
                ? "border-transparent bg-content text-background"
                : "border-border bg-surface text-content hover:border-[#48443f]"
            }`}
          >
            {tab.label}
          </Link>
        ))}
    </nav>
  );
}

interface GenrePage {
  items: Listing[];
  page: number;
  totalPages: number;
}

async function GenreDetails({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: GenreSearchParams;
}) {
  const { slug } = await params;
  const { kind, page: rawPage } = await searchParams;
  const genre = getGenre(slug);
  if (!genre) notFound();

  const view = viewKind(kind);
  const requestedPage = view === "all" ? 1 : parsePageParam(rawPage);
  const headingWord = view === "tv" ? "Series" : "Films";

  function paginationHref(page: number): string {
    const base = `/genres/${slug}?kind=${view}`;
    return page <= 1 ? base : `${base}&page=${page}`;
  }

  // The combined "all" view shows page 1 of both kinds; kind views are paged.
  let films: Listing[] = [];
  let series: Listing[] = [];
  let kindPage: GenrePage | null = null;

  if (view === "movie") {
    kindPage = await getGenreMoviesPage(slug, requestedPage);
    films = kindPage.items;
  } else if (view === "tv") {
    kindPage = await getGenreSeriesPage(slug, requestedPage);
    series = kindPage.items;
  } else {
    [films, series] = await Promise.all([
      getGenreMoviesPage(slug, 1).then((result) => result.items),
      getGenreSeriesPage(slug, 1).then((result) => result.items),
    ]);
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] px-5 py-8 md:px-10 md:py-10 lg:px-14">
      <h1 className="text-[clamp(1.5rem,2.6vw,2.2rem)] font-semibold tracking-tight text-content">
        {genre.label}
      </h1>
      <KindTabs slug={slug} active={view} genre={genre} />

      {view === "all" ? (
        films.length === 0 && series.length === 0 ? (
          <EmptyState message={`No ${genre.label.toLowerCase()} titles are available right now.`} />
        ) : (
          <>
            {films.length > 0 && (
              <KindSection label={`${genre.label} films`} heading="Films" first items={films} />
            )}
            {series.length > 0 && (
              <KindSection label={`${genre.label} series`} heading="Series" items={series} />
            )}
          </>
        )
      ) : kindPage && kindPage.items.length === 0 ? (
        kindPage.totalPages === 0 ? (
          // TMDB has no genre mapping for this kind (e.g. horror series today).
          <EmptyState
            message={`The canonical mapping has no ${view === "tv" ? "series" : "films"} for the ${genre.label} genre — the other kind covers everything this genre holds.`}
          />
        ) : (
          <EmptyState
            message={`No ${view === "tv" ? "series" : "films"} are listed on this page of the ${genre.label.toLowerCase()} ${headingWord.toLowerCase()}.`}
          />
        )
      ) : (
        kindPage && (
          <>
            <KindSection
              label={`${genre.label} ${view === "tv" ? "series" : "films"}`}
              heading={headingWord}
              first
              items={kindPage.items}
            />
            <PaginationNav
              page={kindPage.page}
              totalPages={kindPage.totalPages}
              hrefFor={paginationHref}
              label={`${genre.label} ${headingWord.toLowerCase()} pagination`}
            />
          </>
        )
      )}
    </div>
  );
}

function KindSection({
  label,
  heading,
  items,
  first,
}: {
  label: string;
  heading: string;
  items: Listing[];
  first?: boolean;
}) {
  return (
    <section
      aria-label={label}
      className={`${first ? "mt-8" : "mt-10"} flex flex-col`}
    >
      <h2 className="mb-4 text-2xl font-semibold tracking-tight text-content">
        {heading}
      </h2>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7">
        {items.map((item, index) => (
          <li key={item.route} className="min-w-0">
            <PosterCard item={item} eager={index < 7} entryIndex={index} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="mt-8 flex flex-col items-start gap-3 rounded-2xl border border-border bg-surface px-6 py-10">
      <p className="text-content">{message}</p>
      <Link
        href="/"
        className="text-[13px] font-medium text-content-secondary underline-offset-4 transition-colors hover:text-content hover:underline"
      >
        Back to Discover
      </Link>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import {
  ProfileFavoritesFallback,
  ProfileFavoritesGrid,
} from "@/components/profile-favorites";
import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { computeGenreTabs, type FavoriteDTO } from "@/lib/favorites";
import { GENRE_LABELS, type GenreSlug } from "@/lib/genres";

export const metadata: Metadata = {
  title: "Your favorites",
};

type TypeFilter = "MOVIE" | "TV" | null;

const TYPE_FILTERS: Array<{ value: TypeFilter; label: string; param: string | null }> = [
  { value: null, label: "All", param: null },
  { value: "MOVIE", label: "Films", param: "MOVIE" },
  { value: "TV", label: "Series", param: "TV" },
];

function parseTypeFilter(param: unknown): TypeFilter {
  const value = typeof param === "string" ? param.toUpperCase() : null;
  return value === "MOVIE" || value === "TV" ? value : null;
}

/**
 * Private favorites page. The session read, DB query and URL filters are
 * all request-time data, so everything sits inside one <Suspense>
 * boundary; the rest of the shell (header/footer chrome) streams instantly.
 */
export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <main className="mx-auto w-full max-w-[1600px] px-5 py-10 md:px-10 md:py-12 lg:px-14">
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function ProfileContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser("/profile");
  const params = await searchParams;

  const typeFilter = parseTypeFilter(params.type);
  const genreParam = typeof params.genre === "string" ? params.genre : undefined;
  const genreFilter =
    genreParam !== undefined &&
    Object.prototype.hasOwnProperty.call(GENRE_LABELS, genreParam)
      ? (genreParam as GenreSlug)
      : null;

  const rows = await prisma.favorite.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const visible: FavoriteDTO[] = rows
    .filter(
      (row) =>
        (!typeFilter || row.type === typeFilter) &&
        (!genreFilter || row.genres.includes(genreFilter)),
    )
    .map((row) => ({
      id: row.id,
      itemId: row.type === "MOVIE" ? `/movie/${row.externalId}` : `/tv/${row.externalId}`,
      // BOOK stays defined in the schema (deferred post-MVP) but is never
      // persisted today, so narrowing to the media we actually store is safe.
      type: row.type === "MOVIE" ? ("MOVIE" as const) : ("TV" as const),
      title: row.title,
      posterPath: row.posterPath ?? "",
      genres: row.genres,
      ...(row.year === null ? {} : { year: row.year }),
      createdAt: row.createdAt.toISOString(),
    }));

  const genreTabs = computeGenreTabs(rows);
  const typeCounts = {
    MOVIE: rows.filter((row) => row.type === "MOVIE").length,
    TV: rows.filter((row) => row.type === "TV").length,
  };

  const profileHref = (queries: { type?: string; genre?: string }) => {
    const search = new URLSearchParams();
    if (queries.type) search.set("type", queries.type);
    if (queries.genre) search.set("genre", queries.genre);
    const suffix = search.toString();
    return suffix ? `/profile?${suffix}` : "/profile";
  };

  return (
    <div>
      <header className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.38em] text-content-muted">
          Signed in as {user.email}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-content md:text-[28px]">
          Your favorites
        </h1>
        <p className="mt-1.5 max-w-[42rem] text-[14px] leading-relaxed text-content-secondary">
          {rows.length === 0
            ? "Titles you save on any detail page live here — they follow you across devices."
            : `${rows.length} saved ${rows.length === 1 ? "title" : "titles"}. Snapshots (title, year, genres) were captured at save time; ratings and artwork freshness come from live pages.`}
        </p>
      </header>

      {rows.length > 0 ? (
        <nav aria-label="Favorite filters" className="mb-8 flex flex-col gap-4">
          <div className="flex flex-wrap gap-1.5">
            {TYPE_FILTERS.map((filter) => {
              const active = filter.value === typeFilter;
              const count =
                filter.value === "MOVIE"
                  ? typeCounts.MOVIE
                  : filter.value === "TV"
                    ? typeCounts.TV
                    : rows.length;
              return (
                <Link
                  key={filter.label}
                  href={profileHref({ type: filter.param ?? undefined, genre: genreFilter ?? undefined })}
                  aria-current={active ? "true" : undefined}
                  className={`rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
                    active
                      ? "border-content/40 bg-content/10 text-content"
                      : "border-border text-content-secondary hover:border-[#48443f] hover:text-content"
                  }`}
                >
                  {filter.label}
                  <span className="ml-1.5 text-content-muted">{count}</span>
                </Link>
              );
            })}
          </div>

          {genreTabs.length > 1 ? (
            <div className="flex flex-wrap gap-1.5">
              {genreTabs.map((tab) => {
                const active = tab.slug === genreFilter;
                return (
                  <Link
                    key={tab.slug}
                    href={profileHref({ type: typeFilter ?? undefined, genre: tab.slug })}
                    aria-current={active ? "true" : undefined}
                    className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
                      active
                        ? "border-content/40 bg-content/10 text-content"
                        : "border-border text-content-secondary hover:border-[#48443f] hover:text-content"
                    }`}
                  >
                    {GENRE_LABELS[tab.slug as GenreSlug] ?? tab.slug}
                    <span className="ml-1 text-content-muted">{tab.count}</span>
                  </Link>
                );
              })}
            </div>
          ) : null}
        </nav>
      ) : null}

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface px-6 py-14 text-center">
          <p className="text-[15px] font-medium text-content">No favorites yet.</p>
          <p className="mt-1.5 text-[13px] text-content-secondary">
            Open a title and press{" "}
            <span className="text-favorite">&#9829;</span> Favorite. Start with{" "}
            <Link
              href="/search?kind=movie"
              className="underline decoration-border underline-offset-2 transition-colors hover:text-content"
            >
              films
            </Link>{" "}
            or{" "}
            <Link
              href="/search?kind=tv"
              className="underline decoration-border underline-offset-2 transition-colors hover:text-content"
            >
              series
            </Link>
            .
          </p>
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface px-6 py-14 text-center">
          <p className="text-[15px] font-medium text-content">
            Nothing matches this filter.
          </p>
          <p className='mt-1.5 text-[13px] text-content-secondary'>
            <Link
              href="/profile"
              className="underline decoration-border underline-offset-2 transition-colors hover:text-content"
            >
              Show all favorites
            </Link>
          </p>
        </div>
      ) : (
        <ProfileFavoritesGrid favorites={visible} />
      )}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div aria-busy>
      <div className="h-3 w-40 animate-pulse rounded bg-surface-elevated" />
      <div className="mt-4 h-8 w-64 animate-pulse rounded bg-surface-elevated" />
      <div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded bg-surface-elevated" />
      <ProfileFavoritesFallback />
    </div>
  );
}

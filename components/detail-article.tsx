import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { formatRating, formatRuntime } from "@/lib/format";
import { GENRE_LABELS } from "@/lib/genres";
import type { DetailView } from "@/lib/listing-data";
import { FavoriteButton } from "@/components/favorite-button";
import { PosterRail } from "@/components/poster-rail";
import { CastRail } from "@/components/cast-rail";
import { SeasonList } from "@/components/season-list";
import { ExternalLinks } from "@/components/external-links";
import {
  TRIGGER_PILL_CLASS,
  TrailerTrigger,
} from "@/components/trailer-trigger";
import { WatchPanel } from "@/components/watch-panel";

/**
 * Shared detail layout for /movie/[id] and /tv/[id], visual language of the
 * legacy detail page (backdrop fading into the page, poster, quiet facts).
 */
export function DetailArticle({ detail }: { detail: DetailView }) {
  const { listing } = detail;
  const runtime = formatRuntime(listing.runtimeMin);
  const rating = formatRating(listing.rating);

  const facts = [
    listing.year !== undefined ? String(listing.year) : undefined,
    listing.kind === "film" ? "Film" : "Series",
    listing.network ?? listing.distributor,
    listing.contentRating,
    runtime,
  ].filter((v): v is string => v !== undefined);

  return (
    <article>
      {/* Backdrop fading into the page */}
      <div className="relative h-[260px] w-full overflow-hidden sm:h-[320px] lg:h-[380px]">
        <Image
          src={listing.backdrop ?? listing.poster}
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 1600px, 100vw"
          className="object-cover object-top"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent"
        />
      </div>

      <div className="relative z-10 mx-auto -mt-24 flex w-full max-w-[1600px] flex-col gap-8 px-5 pb-4 md:flex-row md:gap-10 md:px-10 lg:px-14">
        <div className="relative aspect-[2/3] w-36 shrink-0 overflow-hidden rounded-xl bg-surface ring-1 ring-border sm:w-44 lg:w-52">
          <Image
            src={listing.poster}
            alt={`${listing.title} poster`}
            fill
            priority
            sizes="(min-width: 768px) 208px, 144px"
            className="object-cover"
          />
        </div>

        <div className="min-w-0 flex-1">
          <Link
            href="/"
            className="mb-4 inline-flex items-center gap-1.5 text-[12px] text-content-muted transition-colors hover:text-content"
          >
            ← Discover
          </Link>

          <h1 className="text-[clamp(1.7rem,3.2vw,2.9rem)] font-semibold leading-[1.05] tracking-tight text-content">
            {listing.title}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-content-secondary">
            {rating !== undefined && (
              <span className="flex items-center gap-1.5 text-content">
                <Star aria-hidden className="size-3.5 fill-current" />
                <span className="font-medium tabular-nums">{rating}</span>
                <span className="sr-only">/ 10</span>
              </span>
            )}
            {facts.map((fact, i) => (
              <span key={`${fact}-${i}`} className="flex items-center gap-3">
                <span aria-hidden className="size-1 rounded-full bg-content-muted" />
                {fact}
              </span>
            ))}
          </div>

          <p className="mt-3 flex flex-wrap gap-1.5">
            {listing.genres.map((genre) => (
              <Link
                key={genre}
                href={`/genres/${genre}`}
                className="rounded-full border border-border px-2.5 py-0.5 text-[11px] text-content-secondary transition-colors hover:border-[#48443f] hover:text-content"
              >
                {GENRE_LABELS[genre]}
              </Link>
            ))}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <FavoriteButton listing={listing} />
            {listing.kind === "film" && (
              <Link
                href={`${listing.route}/watch`}
                className={`${TRIGGER_PILL_CLASS} flex`}
              >
                {detail.freeFilm ? "Watch" : "Trailer & where to watch"}
              </Link>
            )}
            {detail.trailer && (
              <TrailerTrigger
                trailerKey={detail.trailer.key}
                trailerName={detail.trailer.name}
                watchUrl={`https://www.youtube.com/watch?v=${detail.trailer.key}`}
                title={listing.title}
                className={TRIGGER_PILL_CLASS}
              >
                Play trailer
              </TrailerTrigger>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-10 px-5 pb-16 pt-4 md:flex-row md:px-10 lg:px-14">
        <p className="max-w-[65ch] text-[15px] leading-relaxed text-content-secondary">
          {listing.overview}
        </p>
        {detail.externalLinks.length > 0 && (
          <ExternalLinks links={detail.externalLinks} className="md:ml-auto" />
        )}
      </div>

      {detail.watch?.hasAny ? (
        <section className="mx-auto w-full max-w-[1600px] px-5 pb-16 md:px-10 lg:px-14">
          <WatchPanel watch={detail.watch} />
        </section>
      ) : null}

      {listing.kind === "series" && detail.seasons && detail.seasons.length > 0 && (
        <section className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-5 pb-16 md:px-10 lg:px-14">
          <SeasonList seasons={detail.seasons} />
        </section>
      )}

      {detail.cast.length > 0 && (
        <section className="mx-auto flex w-full max-w-[1600px] flex-col px-5 pb-16 md:px-10 lg:px-14">
          <CastRail cast={detail.cast} />
        </section>
      )}

      {detail.related.length > 0 && (
        <section className="mx-auto w-full max-w-[1600px] px-5 pb-16 md:px-10 lg:px-14">
          <PosterRail title="More like this" items={detail.related} />
        </section>
      )}
    </article>
  );
}

/** Instant-shell fallback while params resolve and detail data streams in. */
export function DetailSkeleton() {
  return (
    <div aria-hidden>
      <div className="h-[260px] w-full animate-pulse bg-surface sm:h-[320px] lg:h-[380px]" />
      <div className="mx-auto flex w-full max-w-[1600px] gap-8 px-5 pt-10 md:gap-10 md:px-10 lg:px-14">
        <div className="aspect-[2/3] w-36 shrink-0 animate-pulse rounded-xl bg-surface sm:w-44 lg:w-52" />
        <div className="flex-1 pt-2">
          <div className="h-9 w-2/5 animate-pulse rounded-lg bg-surface" />
          <div className="mt-4 h-4 w-1/4 animate-pulse rounded bg-surface" />
        </div>
      </div>
    </div>
  );
}

import { notFound } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { getMovieDetail } from "@/lib/listing-data";
import { resolveFreeFilm } from "@/lib/free-film";
import { formatRuntime } from "@/lib/format";
import {
  TRIGGER_PILL_CLASS,
  TrailerTrigger,
} from "@/components/trailer-trigger";
import { WatchPanel } from "@/components/watch-panel";
import { FreeFilmPlayer } from "@/components/free-film-player";
import { DetailSkeleton } from "@/components/detail-article";
import type { FreeFilmInfo } from "@/lib/free-film";

/**
 * Watch page (docs/PROJECT_PLAN.md → Watch Page §5): movies only.
 * 1. Curated free film + verified Internet Archive item → full-film embed
 *    with its license, source and single-country caveat below.
 * 2. Otherwise — including a seeded but currently unverified copy — the
 *    trailer embed plus Where to watch, with an honest banner.
 */

interface WatchPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: WatchPageProps): Promise<Metadata> {
  const { id } = await params;
  const numericId = Number.parseInt(id, 10);
  if (!Number.isInteger(numericId) || numericId <= 0) return {};
  const detail = await getMovieDetail(numericId);
  if (!detail) return {};
  return { title: `Watch ${detail.listing.title}`, description: detail.listing.overview };
}

export default function WatchPage({ params }: WatchPageProps) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <WatchContent params={params} />
    </Suspense>
  );
}

async function WatchContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numericId = Number.parseInt(id, 10);
  if (!Number.isInteger(numericId) || numericId <= 0) notFound();

  const [detail, freeFilm] = await Promise.all([
    getMovieDetail(numericId),
    resolveFreeFilm(numericId),
  ]);
  if (!detail) notFound();
  const { listing } = detail;

  return (
    <div className="mx-auto w-full max-w-[1600px] px-5 pb-16 pt-8 md:px-10 lg:px-14">
      <Link
        href={listing.route}
        className="inline-flex items-center gap-1.5 text-[12px] text-content-muted transition-colors hover:text-content"
      >
        ← {listing.title}
      </Link>
      <h1 className="mt-3 text-[clamp(1.5rem,2.6vw,2.2rem)] font-semibold tracking-tight text-content">
        {listing.title}
      </h1>
      <p className="mt-1 flex items-center gap-2 text-[13px] text-content-secondary">
        <span className="rounded-full border border-border px-2.5 py-0.5 text-[11px]">
          {listing.kind === "film" ? "Film" : "Series"}
        </span>
        {listing.year !== undefined && <span>{listing.year}</span>}
      </p>

      {freeFilm ? (
        freeFilm.archive ? (
          <FreeSection free={freeFilm} archive={freeFilm.archive} title={listing.title} />
        ) : (
          <UnverifiedSection free={freeFilm} detail={detail} />
        )
      ) : (
        <FallbackSection detail={detail} />
      )}
    </div>
  );
}

function FreeSection({
  free,
  archive,
  title,
}: {
  free: FreeFilmInfo;
  archive: NonNullable<FreeFilmInfo["archive"]>;
  title: string;
}) {
  const runtime =
    archive.runtimeSeconds !== undefined
      ? formatRuntime(Math.round(archive.runtimeSeconds / 60))
      : undefined;

  return (
    <section aria-label="Full film" className="mt-6 flex flex-col gap-4">
      <p className="inline-flex w-fit items-center gap-2 rounded-full bg-content px-3.5 py-1 text-[12px] font-semibold text-background">
        Full film — {free.license}
      </p>
      <FreeFilmPlayer archive={archive} title={title} />

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface px-5 py-4 md:px-6">
        <p className="text-[13px] text-content">
          Full film streaming courtesy of the{" "}
          <a
            href="https://archive.org/"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4 transition-colors hover:text-content"
          >
            Internet Archive
          </a>{" "}
          — item{" "}
          <a
            href={`https://archive.org/details/${encodeURIComponent(archive.identifier)}`}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4 transition-colors hover:text-content"
          >
            {archive.identifier}
          </a>
          {runtime && <> · distributed copy runs {runtime}</>}
          .
        </p>
        {free.licenseUrl && (
          <p className="text-[13px] text-content-secondary">
            License:{" "}
            <a
              href={free.licenseUrl}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4 transition-colors hover:text-content"
            >
              {free.license} — reference
            </a>
          </p>
        )}
        {free.notes && (
          <p className="text-[12px] leading-relaxed text-content-muted">
            {free.notes}
          </p>
        )}
        <p className="text-[12px] text-content-muted">
          Public-domain status varies by country — this claim is for the
          United States. The copy above is the same one the Internet Archive
          serves publicly.
        </p>
      </div>
    </section>
  );
}

type Detail = NonNullable<Awaited<ReturnType<typeof getMovieDetail>>>;

function UnverifiedSection({
  free,
  detail,
}: {
  free: FreeFilmInfo;
  detail: Detail;
}) {
  return (
    <>
      <div className="mt-6 rounded-2xl border border-amber-700/40 bg-amber-500/10 px-5 py-4 text-[13px] text-content">
        <p>
          This film is registered as a curated free title, but its Internet
          Archive copy could not be verified right now, so the full-film
          player is not shown.{" "}
          <a
            href={`https://archive.org/details/${encodeURIComponent(free.archiveIdentifier)}`}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4 transition-colors hover:text-content"
          >
            Check the item page on archive.org
          </a>{" "}
          — the trailer and streaming options stay below.
        </p>
      </div>
      <FallbackSection detail={detail} />
    </>
  );
}

function FallbackSection({ detail }: { detail: Detail }) {
  const { listing, trailer, watch } = detail;
  return (
    <section aria-label="Trailer and where to watch" className="mt-8 flex flex-col gap-6">
      <p className="rounded-2xl border border-border bg-surface px-5 py-3 text-[13px] text-content-secondary">
        No verified free stream for this film — the trailer and streaming
        options below are the honest alternative.
      </p>

      {trailer ? (
        <TrailerTrigger
          trailerKey={trailer.key}
          trailerName={trailer.name}
          watchUrl={`https://www.youtube.com/watch?v=${trailer.key}`}
          title={listing.title}
          className={TRIGGER_PILL_CLASS}
        >
          Play trailer
        </TrailerTrigger>
      ) : (
        <p className="text-[13px] text-content-muted">
          No trailer is available on the source either.
        </p>
      )}

      {watch?.hasAny && (
        <div>
          <h2 className="mb-4 text-xl font-semibold tracking-tight text-content">
            Where to watch
          </h2>
          <WatchPanel watch={watch} />
        </div>
      )}
    </section>
  );
}

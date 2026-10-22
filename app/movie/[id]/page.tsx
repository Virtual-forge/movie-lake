import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";
import { getMovieDetail } from "@/lib/listing-data";
import { resolveFreeFilm } from "@/lib/free-film";
import { detailSeo } from "@/lib/seo";
import {
  DetailArticle,
  DetailSkeleton,
} from "@/components/detail-article";

interface MoviePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: MoviePageProps): Promise<Metadata> {
  const { id } = await params;
  const numericId = Number.parseInt(id, 10);
  if (!Number.isInteger(numericId) || numericId <= 0) return {};
  const detail = await getMovieDetail(numericId);
  if (!detail) return {};
  return detailSeo(detail);
}

/** Instant shell (layout + skeleton); URL-dependent detail streams in. */
export default function MoviePage({ params }: MoviePageProps) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <MovieDetails params={params} />
    </Suspense>
  );
}

async function MovieDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numericId = Number.parseInt(id, 10);
  if (!Number.isInteger(numericId) || numericId <= 0) notFound();

  // Detail data is `use cache`d TMDB; the curated free-film record is a
  // live DB read so seed edits surface immediately.
  const [detail, freeFilm] = await Promise.all([
    getMovieDetail(numericId),
    resolveFreeFilm(numericId),
  ]);
  if (!detail) notFound();

  return (
    <DetailArticle
      detail={freeFilm ? { ...detail, freeFilm } : detail}
    />
  );
}

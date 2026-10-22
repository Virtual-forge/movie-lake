import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";
import { getTvDetail } from "@/lib/listing-data";
import { detailSeo } from "@/lib/seo";
import {
  DetailArticle,
  DetailSkeleton,
} from "@/components/detail-article";

interface TvPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: TvPageProps): Promise<Metadata> {
  const { id } = await params;
  const numericId = Number.parseInt(id, 10);
  if (!Number.isInteger(numericId) || numericId <= 0) return {};
  const detail = await getTvDetail(numericId);
  if (!detail) return {};
  return detailSeo(detail);
}

/** Instant shell (layout + skeleton); URL-dependent detail streams in. */
export default function TvPage({ params }: TvPageProps) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <TvDetails params={params} />
    </Suspense>
  );
}

async function TvDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numericId = Number.parseInt(id, 10);
  if (!Number.isInteger(numericId) || numericId <= 0) notFound();

  const detail = await getTvDetail(numericId);
  if (!detail) notFound();

  return <DetailArticle detail={detail} />;
}

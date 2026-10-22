import type { Metadata } from "next";
import type { GenreDef } from "@/lib/genres";
import type { DetailView } from "@/lib/listing-data";

/**
 * SEO metadata builders (docs/PROJECT_PLAN.md Phase 5 → "SEO metadata
 * (detail + genre pages)"). Pure functions so pages wire them into
 * generateMetadata and the shapes stay unit-tested.
 *
 * Social-card images are the listing's absolute TMDB CDN URLs, so no
 * metadataBase is involved — relative URL-based metadata without one is a
 * build error, absolute URLs are valid as-is (metadata reference: "If a
 * metadata field provides an absolute URL, metadataBase will be ignored").
 * Titles flow through the root layout template ("%s — Movie Lake").
 */

const SITE_NAME = "Movie Lake";

/**
 * Wide wide-artwork wins the card; the guaranteed portrait poster is the
 * fallback so every detail page has an image.
 */
function socialImage(detail: DetailView): string | undefined {
  return detail.listing.backdrop ?? detail.listing.poster ?? undefined;
}

/**
 * Honest overview passthrough — never a fabricated blurb. When the source
 * has no overview at all, a minimal factual line with title/year.
 */
export function listingDescription(listing: DetailView["listing"]): string {
  const overview = listing.overview?.trim();
  if (overview) return overview;
  const year = listing.year !== undefined ? ` (${listing.year})` : "";
  return `${listing.title}${year} — details on ${SITE_NAME}.`;
}

export function detailSeo(detail: DetailView): Metadata {
  const { listing } = detail;
  const title = listing.title;
  const description = listingDescription(listing);
  const image = socialImage(detail);
  return {
    title,
    description,
    openGraph: {
      type: listing.kind === "film" ? "video.movie" : "video.tv_show",
      siteName: SITE_NAME,
      title,
      description,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export function genreSeo(genre: GenreDef): Metadata {
  const title = `${genre.label} movies & series`;
  const description = `Browse ${genre.label.toLowerCase()} movies and series, with year, rating and where-to-watch info on each title.`;
  return {
    title,
    description,
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
    },
  };
}

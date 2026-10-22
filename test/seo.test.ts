import { describe, expect, it } from "vitest";
import type { Metadata } from "next";
import { detailSeo, genreSeo, listingDescription } from "@/lib/seo";
import type { DetailView } from "@/lib/listing-data";
import type { Listing } from "@/types/listing";

/**
 * {@link Metadata} types openGraph/twitter as a discriminated union with a
 * bare-object escape variant (no `type`/`card`), so narrow via `in`; these
 * helpers throw instead of returning undefined — a missing shape IS the
 * assertion failure.
 */
function og(meta: Metadata) {
  const value = meta.openGraph;
  if (!value || typeof value !== "object" || !("type" in value)) {
    throw new Error(`openGraph did not resolve to a typed object: ${JSON.stringify(value)}`);
  }
  return value;
}

function tw(meta: Metadata) {
  const value = meta.twitter;
  if (!value || typeof value !== "object" || !("card" in value)) {
    throw new Error(`twitter did not resolve to a typed object: ${JSON.stringify(value)}`);
  }
  return value;
}

function fakeListing(overrides: Partial<Listing> = {}): Listing {
  return {
    source: "tmdb",
    kind: "film",
    externalId: 693134,
    route: "/movie/693134",
    title: "Dune: Part Two",
    year: 2024,
    rating: 8.1,
    genres: ["science-fiction"],
    poster: "https://image.tmdb.org/t/p/w342/poster.jpg",
    ...overrides,
  };
}

function fakeDetail(listing: Listing = fakeListing()): DetailView {
  return {
    listing,
    cast: [],
    related: [],
    externalLinks: [],
  };
}

describe("listingDescription", () => {
  it("passes the real overview through, trimmed", () => {
    expect(
      listingDescription(fakeListing({ overview: "  The sand rides again. " })),
    ).toBe("The sand rides again.");
  });

  it("never fabricates: composes a factual line when the overview is missing", () => {
    expect(listingDescription(fakeListing({ overview: undefined }))).toBe(
      "Dune: Part Two (2024) — details on Movie Lake.",
    );
    expect(listingDescription(fakeListing({ overview: "   " }))).toContain(
      "Dune: Part Two",
    );
  });
});

describe("detailSeo", () => {
  it("uses the real title/overview and the template-friendly bare title", () => {
    const meta = detailSeo(fakeDetail(fakeListing({ overview: "Paul rides a worm." })));
    expect(meta.title).toBe("Dune: Part Two");
    expect(meta.description).toBe("Paul rides a worm.");
  });

  it("marks movies as video.movie and series as video.tv_show", () => {
    expect(og(detailSeo(fakeDetail())).type).toBe("video.movie");
    expect(
      og(
        detailSeo(
          fakeDetail(fakeListing({ kind: "series", route: "/tv/1396", externalId: 1396 })),
        ),
      ).type,
    ).toBe("video.tv_show");
  });

  it("prefers the wide backdrop for the social card, falling back to the poster", () => {
    const withBackdrop = detailSeo(
      fakeDetail(fakeListing({ backdrop: "https://image.tmdb.org/t/p/w780/bd.jpg" })),
    );
    expect(og(withBackdrop).images).toEqual([
      { url: "https://image.tmdb.org/t/p/w780/bd.jpg" },
    ]);
    expect(tw(withBackdrop).card).toBe("summary_large_image");

    const posterOnly = detailSeo(fakeDetail());
    expect(og(posterOnly).images).toEqual([
      { url: "https://image.tmdb.org/t/p/w342/poster.jpg" },
    ]);
  });

  it("degrades the twitter card honestly without any artwork", () => {
    const meta = detailSeo(fakeDetail(fakeListing({ poster: "", backdrop: undefined })));
    expect(og(meta).images).toBeUndefined();
    expect(tw(meta).card).toBe("summary");
  });
});

describe("genreSeo", () => {
  it("titles genre pages from the canonical label", () => {
    const meta = genreSeo({ slug: "action", label: "Action", movie: [28], tv: [10759] });
    expect(meta.title).toBe("Action movies & series");
    expect(meta.description).toContain("action");
    expect(og(meta).type).toBe("website");
    expect(og(meta).siteName).toBe("Movie Lake");
  });
});

import { describe, expect, it } from "vitest";

import {
  buildFavoriteRoute,
  computeGenreTabs,
  favoriteSnapshotFromListing,
  parseFavoriteRoute,
  tmdbPosterPathFromUrl,
} from "@/lib/favorites";
import { sanitizeRedirect } from "@/lib/redirect";
import type { Listing } from "@/types/listing";

describe("parseFavoriteRoute", () => {
  it("accepts movie and tv routes", () => {
    expect(parseFavoriteRoute("/movie/693134")).toEqual({
      source: "TMDB",
      type: "MOVIE",
      externalId: "693134",
    });
    expect(parseFavoriteRoute("/tv/1396")).toEqual({
      source: "TMDB",
      type: "TV",
      externalId: "1396",
    });
  });

  it("rejects unknown shapes", () => {
    expect(parseFavoriteRoute("/title/dune")).toBeNull();
    expect(parseFavoriteRoute("/movie/not-a-number")).toBeNull();
    expect(parseFavoriteRoute("movie/123")).toBeNull();
    expect(parseFavoriteRoute("/movie/dune/that")).toBeNull();
    expect(parseFavoriteRoute("")).toBeNull();
    expect(parseFavoriteRoute("/book/42")).toBeNull();
  });
});

describe("buildFavoriteRoute", () => {
  it("round-trips with the parser", () => {
    const parsed = parseFavoriteRoute("/tv/1396");
    if (!parsed) throw new Error("expected a parse");
    expect(buildFavoriteRoute(parsed.type, parsed.externalId)).toBe("/tv/1396");
  });
});

describe("tmdbPosterPathFromUrl", () => {
  it("strips host and size directory", () => {
    expect(
      tmdbPosterPathFromUrl("https://image.tmdb.org/t/p/w342/aB3.jpg"),
    ).toBe("/aB3.jpg");
    expect(
      tmdbPosterPathFromUrl("https://image.tmdb.org/t/p/w780/aB3.jpg"),
    ).toBe("/aB3.jpg");
  });

  it("returns undefined for non-TMDB or malformed URLs", () => {
    expect(tmdbPosterPathFromUrl("https://example.com/poster.jpg")).toBeUndefined();
    expect(tmdbPosterPathFromUrl("https://image.tmdb.org/t/p/w342/")).toBeUndefined();
    expect(tmdbPosterPathFromUrl("not a url")).toBeUndefined();
  });
});

describe("favoriteSnapshotFromListing", () => {
  it("captures the fields stored at save time and omits nothing extra", () => {
    const listing = {
      source: "tmdb",
      kind: "film",
      externalId: 693134,
      route: "/movie/693134",
      title: "Dune: Part Two",
      year: 2024,
      genres: ["science-fiction"],
      poster: "https://image.tmdb.org/t/p/w342/aB3.jpg",
    } as unknown as Listing;
    expect(favoriteSnapshotFromListing(listing)).toEqual({
      title: "Dune: Part Two",
      posterPath: "/aB3.jpg",
      genres: ["science-fiction"],
      year: 2024,
    });
  });

  it("omits year when the listing has none", () => {
    const listing = {
      source: "tmdb",
      kind: "film",
      externalId: 5,
      route: "/movie/5",
      title: "T",
      genres: [],
      poster: "https://image.tmdb.org/t/p/w342/x.jpg",
    } as unknown as Listing;
    expect(favoriteSnapshotFromListing(listing)).not.toHaveProperty("year");
  });
});

describe("computeGenreTabs", () => {
  it("counts across favorites, sorted by count then label", () => {
    expect(
      computeGenreTabs([
        { genres: ["drama", "crime"] },
        { genres: ["drama"] },
        { genres: ["drama", "crime"] },
      ]),
    ).toEqual([
      { slug: "drama", count: 3 },
      { slug: "crime", count: 2 },
    ]);
  });

  it("returns an empty list for no favorites", () => {
    expect(computeGenreTabs([])).toEqual([]);
  });
});

describe("sanitizeRedirect", () => {
  it("keeps same-origin app paths", () => {
    expect(sanitizeRedirect("/profile")).toBe("/profile");
    expect(sanitizeRedirect("/movie/693134?type=x")).toBe("/movie/693134?type=x");
  });

  it("rejects off-site hijacks and control characters", () => {
    expect(sanitizeRedirect("https://evil.tld")).toBeUndefined();
    expect(sanitizeRedirect("//evil.tld")).toBeUndefined();
    expect(sanitizeRedirect("\\evil")).toBeUndefined();
    expect(sanitizeRedirect("javascript:alert(1)")).toBeUndefined();
    expect(sanitizeRedirect("/next\nSet-Cookie: x")).toBeUndefined();
    expect(sanitizeRedirect(null)).toBeUndefined();
    expect(sanitizeRedirect("profile")).toBeUndefined();
  });
});

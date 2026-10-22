import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  normalizeMediaResult,
  normalizeMovieDetails,
  normalizeTvDetails,
  pickYouTubeTrailer,
  watchProvidersView,
} from "@/lib/normalize";

/** Recorded TMDB payloads (October 2026) - keeps tests offline and honest. */
function fixture(name: string): unknown {
  return JSON.parse(
    readFileSync(
      fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)),
      "utf8",
    ),
  );
}

interface TmdbPreviewFixture {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string;
  backdrop_path?: string;
}

describe("normalizeMediaResult", () => {
  it("maps a trending movie preview into the shared Listing shape", () => {
    const raw = fixture("movie-result.json") as TmdbPreviewFixture;
    const listing = normalizeMediaResult(raw, "movie");

    expect(listing).not.toBeNull();
    expect(listing?.source).toBe("tmdb");
    expect(listing?.kind).toBe("film");
    expect(listing?.externalId).toBe(raw.id);
    expect(listing?.route).toBe(`/movie/${raw.id}`);
    expect(listing?.title?.length ?? 0).toBeGreaterThan(0);
    expect(listing?.year).toBe(Number(
      (raw.release_date ?? "").slice(0, 4),
    ));
    expect(listing?.poster).toContain("/t/p/w342");
    expect(listing?.backdrop).toContain("/t/p/w780");
  });

  it("maps a trending tv preview, keeping outside ids in the series route", () => {
    const raw = fixture("tv-result.json") as TmdbPreviewFixture;
    const listing = normalizeMediaResult(raw, "tv");

    expect(listing?.kind).toBe("series");
    expect(listing?.externalId).toBe(raw.id);
    expect(listing?.route).toBe(`/tv/${raw.id}`);
    expect(listing?.year).toBe(Number(
      (raw.first_air_date ?? "").slice(0, 4),
    ));
  });

  it("rejects results without poster artwork", () => {
    const raw = fixture("movie-result.json") as TmdbPreviewFixture;
    expect(
      normalizeMediaResult({ ...raw, poster_path: null }, "movie"),
    ).toBeNull();
  });

  it("rejects results without a title", () => {
    const raw = fixture("movie-result.json") as TmdbPreviewFixture;
    expect(
      normalizeMediaResult({ ...raw, title: "  ", name: undefined }, "movie"),
    ).toBeNull();
  });
});

describe("normalizeMovieDetails", () => {
  const detail = normalizeMovieDetails(
    fixture("movie-details.json") as Parameters<typeof normalizeMovieDetails>[0],
  );

  it("links to the new movie detail route", () => {
    expect(detail?.kind).toBe("film");
    expect(detail?.route).toBe(`/movie/${detail?.externalId}`);
  });

  it("extracts the US certification from release_dates", () => {
    expect(detail?.contentRating).toBe("PG-13");
  });

  it("extracts runtime and distributor", () => {
    expect(detail?.runtimeMin).toBe(167);
    expect(detail?.distributor).toBe("Legendary Pictures");
  });

  it("maps TMDB genres onto canonical slugs", () => {
    expect(detail?.genres).toContain("science-fiction");
    expect(detail?.genres).toContain("adventure");
  });
});

describe("normalizeTvDetails", () => {
  const detail = normalizeTvDetails(
    fixture("tv-details.json") as Parameters<typeof normalizeTvDetails>[0],
  );

  it("maps a series onto the tv detail route", () => {
    expect(detail?.kind).toBe("series");
    expect(detail?.route).toBe(`/tv/${detail?.externalId}`);
  });

  it("extracts network and US advisory", () => {
    expect(detail?.network).toBe("Max");
    expect(detail?.contentRating).toBe("TV-MA");
  });

  it("leaves runtime undefined when the upstream omits episode runtime", () => {
    expect(detail?.runtimeMin).toBeUndefined();
  });
});

describe("pickYouTubeTrailer", () => {
  const dune = JSON.parse(
    readFileSync(
      fileURLToPath(new URL("./fixtures/movie-details-693134.json", import.meta.url)),
      "utf8",
    ),
  );

  it("prefers the official trailer in the recorded payload", () => {
    const trailer = pickYouTubeTrailer(dune.videos);
    expect(trailer?.name).toBe("Official Trailer 3");
    expect(trailer?.key).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("falls back to any trailer, then teaser, then first YouTube video", () => {
    const anyTrailer = pickYouTubeTrailer({
      results: [
        { id: "1", key: "clipKey", site: "YouTube", type: "Clip", official: true },
        { id: "2", key: "teaserKey", site: "YouTube", type: "Teaser" },
      ],
    });
    expect(anyTrailer?.key).toBe("teaserKey");

    const first = pickYouTubeTrailer({
      results: [{ id: "3", key: "whateverKey", site: "YouTube", type: "Clip" }],
    });
    expect(first?.key).toBe("whateverKey");
  });

  it("ignores non-YouTube videos and empty input", () => {
    expect(
      pickYouTubeTrailer({
        results: [{ id: "1", key: "v", site: "Vimeo", type: "Trailer" }],
      }),
    ).toBeNull();
    expect(pickYouTubeTrailer(undefined)).toBeNull();
    expect(pickYouTubeTrailer({ results: [] })).toBeNull();
  });
});

describe("watchProvidersView", () => {
  const dune = JSON.parse(
    readFileSync(
      fileURLToPath(new URL("./fixtures/movie-details-693134.json", import.meta.url)),
      "utf8",
    ),
  );
  const breakingBad = JSON.parse(
    readFileSync(
      fileURLToPath(new URL("./fixtures/tv-details-1396.json", import.meta.url)),
      "utf8",
    ),
  );

  it("reads US slices from the recorded Dune payload, priority-sorted", () => {
    const view = watchProvidersView(dune["watch/providers"] as never);
    expect(view?.hasAny).toBe(true);
    expect(view?.region).toBe("US");
    expect(view?.link).toBeTruthy();
    expect(view?.slices.flatrate?.[0]?.name).toBe("HBO Max Amazon Channel");
    expect(view?.slices.rent?.length).toBeGreaterThan(0);
    expect(view?.slices.buy?.length).toBeGreaterThan(0);
    expect((view?.slices.flatrate ?? []).every((p) => p.logoUrl)).toBe(true);
  });

  it("omits empty slices (Breaking Bad has US flatrate + buy, no rent)", () => {
    const view = watchProvidersView(breakingBad["watch/providers"] as never);
    expect(view?.slices.rent).toBeUndefined();
    expect(view?.slices.flatrate?.length).toBeGreaterThanOrEqual(1);
    expect(view?.slices.buy?.length).toBeGreaterThan(0);
  });

  it("caps each slice and dedupes provider ids", () => {
    const heavy = watchProvidersView(
      {
        results: {
          US: {
            flatrate: Array.from({ length: 12 }, (_, i) => ({
              provider_id: i + 1,
              provider_name: `P${i + 1}`,
              display_priority: i,
            })),
          },
        },
      } as never,
    );
    expect(heavy?.slices.flatrate?.length).toBe(8);
    expect(heavy?.slices.flatrate?.at(-1)?.name).toBe("P8");
  });

  it("leads with free and free-with-ads slices when the US set has them (M11)", () => {
    const view = watchProvidersView({
      results: {
        US: {
          link: "https://www.themoviedb.org/movie/693134/watch",
          flatrate: [{ provider_id: 101, provider_name: "Paid Service", display_priority: 1 }],
          free: [{ provider_id: 73, provider_name: "Tubi", display_priority: 1 }],
          ads: [{ provider_id: 305, provider_name: "Plex", display_priority: 2 }],
        },
      },
    } as never);
    const sliceOrder = Object.keys(view?.slices ?? {});
    expect(sliceOrder.slice(0, 2).join(",")).toBe("free,ads");
    expect(view?.slices.free?.[0]?.name).toBe("Tubi");
    expect(view?.slices.ads?.[0]?.name).toBe("Plex");
    expect(view?.hasAny).toBe(true);
  });

  it("treats a free-only offer set as a valid panel (hasAny)", () => {
    const view = watchProvidersView({
      results: {
        US: { free: [{ provider_id: 73, provider_name: "Tubi", display_priority: 1 }] },
      },
    } as never);
    expect(view?.hasAny).toBe(true);
    expect(view?.slices.flatrate).toBeUndefined();
    expect(view?.slices.free?.length).toBe(1);
  });

  it("returns null without a US entry", () => {
    expect(
      watchProvidersView({ results: { GB: { flatrate: [] } } } as never),
    ).toBeNull();
    expect(watchProvidersView(undefined)).toBeNull();
  });
});

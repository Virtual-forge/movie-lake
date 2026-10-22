import { describe, expect, it } from "vitest";
import {
  GENRES,
  GENRES_BY_SLUG,
  GENRE_LABELS,
  HOMEPAGE_CHIP_SLUGS,
  getGenre,
  slugsFromTmdbGenreIds,
  tmdbGenreParam,
} from "@/lib/genres";

describe("canonical genre taxonomy", () => {
  it("has 14 canonical genres with unique slugs", () => {
    expect(GENRES).toHaveLength(14);
    const slugs = GENRES.map((genre) => genre.slug);
    expect(new Set(slugs).size).toBe(14);
  });

  it("homepage chips are the curated reference subset in reference order", () => {
    expect(HOMEPAGE_CHIP_SLUGS).toEqual([
      "action",
      "comedy",
      "history",
      "drama",
      "science-fiction",
      "fantasy",
      "musical",
      "documentary",
    ]);
    for (const slug of HOMEPAGE_CHIP_SLUGS) {
      expect(GENRES_BY_SLUG[slug]).toBeDefined();
    }
  });

  it("uses the plan's labels", () => {
    expect(GENRE_LABELS.history).toBe("Historical");
    expect(GENRE_LABELS["science-fiction"]).toBe("Sci-fi");
    expect(GENRE_LABELS.musical).toBe("Musical");
  });
});

describe("tmdbGenreParam", () => {
  it("resolves movie genres to their verified TMDB ids", () => {
    expect(tmdbGenreParam("action", "movie")).toBe("28");
    expect(tmdbGenreParam("adventure", "movie")).toBe("12");
    expect(tmdbGenreParam("musical", "movie")).toBe("10402");
    expect(tmdbGenreParam("history", "movie")).toBe("36");
  });

  it("resolves tv genres, including the combined tv veneer ids", () => {
    expect(tmdbGenreParam("adventure", "tv")).toBe("10759");
    expect(tmdbGenreParam("science-fiction", "tv")).toBe("10765");
    expect(tmdbGenreParam("fantasy", "tv")).toBe("10765");
    expect(tmdbGenreParam("crime", "tv")).toBe("80");
  });

  it("returns undefined when the kind has no TMDB genre", () => {
    expect(tmdbGenreParam("history", "tv")).toBeUndefined();
    expect(tmdbGenreParam("musical", "tv")).toBeUndefined();
    expect(tmdbGenreParam("romance", "tv")).toBeUndefined();
    expect(tmdbGenreParam("horror", "tv")).toBeUndefined();
    expect(tmdbGenreParam("thriller", "tv")).toBeUndefined();
  });

  it("returns undefined for unknown slugs", () => {
    expect(getGenre("sci-fi")).toBeUndefined(); // legacy slug was retired
    expect(getGenre("nope")).toBeUndefined();
  });
});

describe("slugsFromTmdbGenreIds", () => {
  it("expands combined tv genres into multiple canonical slugs", () => {
    expect(slugsFromTmdbGenreIds([10759], "tv")).toEqual([
      "action",
      "adventure",
    ]);
    expect(slugsFromTmdbGenreIds([10765], "tv")).toEqual([
      "science-fiction",
      "fantasy",
    ]);
  });

  it("maps plain movie and tv ids", () => {
    expect(slugsFromTmdbGenreIds([28], "movie")).toEqual(["action"]);
    expect(slugsFromTmdbGenreIds([18], "tv")).toEqual(["drama"]);
  });

  it("de-duplicates and ignores unknown ids", () => {
    expect(slugsFromTmdbGenreIds([28, 28, 999999], "movie")).toEqual([
      "action",
    ]);
    expect(slugsFromTmdbGenreIds(/* none */ [], "movie")).toEqual([]);
    expect(slugsFromTmdbGenreIds(undefined, "movie")).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import {
  advancedHref,
  filtersToSearchParams,
  hasDegradingFilters,
  parseAdvancedFilters,
} from "@/lib/search-filters";

describe("parseAdvancedFilters", () => {
  it("defaults to both types, no filters, popular order", () => {
    const filters = parseAdvancedFilters({});
    expect(filters.types).toEqual(["movie", "tv"]);
    expect(filters.genres).toEqual([]);
    expect(filters.yearFrom).toBeUndefined();
    expect(filters.yearTo).toBeUndefined();
    expect(filters.ratingMin).toBeUndefined();
    expect(filters.ratingMax).toBeUndefined();
    expect(filters.sortBy).toBe("popularity");
    expect(filters.query).toBe("");
  });

  it("keeps only TMDB types and restores canonical order", () => {
    expect(parseAdvancedFilters({ types: "tv" }).types).toEqual(["tv"]);
    expect(parseAdvancedFilters({ types: "movie,tv" }).types).toEqual(["movie", "tv"]);
    expect(parseAdvancedFilters({ types: "tv,movie" }).types).toEqual(["movie", "tv"]);
    expect(parseAdvancedFilters({ types: "bogus,movie" }).types).toEqual(["movie"]);
    // Nothing valid left means both again.
    expect(parseAdvancedFilters({ types: "book,bogus" }).types).toEqual(["movie", "tv"]);
  });

  it("keeps canonical slugs only, deduped and ordered", () => {
    const filters = parseAdvancedFilters({ genres: "action,nope,action,comedy" });
    expect(filters.genres).toEqual(["action", "comedy"]);
  });

  it("flattens repeated form params the same as comma-joined links", () => {
    const filters = parseAdvancedFilters({
      types: ["movie", "tv"],
      genres: ["action", "comedy", "action"],
    });
    expect(filters.types).toEqual(["movie", "tv"]);
    expect(filters.genres).toEqual(["action", "comedy"]);
  });

  it("accepts in-window years and swaps an inverted range", () => {
    expect(parseAdvancedFilters({ yearFrom: "1980", yearTo: "1999" })).toMatchObject({
      yearFrom: 1980,
      yearTo: 1999,
    });
    expect(parseAdvancedFilters({ yearFrom: "1999", yearTo: "1980" })).toMatchObject({
      yearFrom: 1980,
      yearTo: 1999,
    });
  });

  it("discards years outside the plausible window or malformed", () => {
    expect(parseAdvancedFilters({ yearFrom: "1800" }).yearFrom).toBeUndefined();
    expect(parseAdvancedFilters({ yearTo: "9999" }).yearTo).toBeUndefined();
    expect(parseAdvancedFilters({ yearFrom: "abc" }).yearFrom).toBeUndefined();
    expect(parseAdvancedFilters({ yearFrom: "1995.5" }).yearFrom).toBeUndefined();
    // Empty text is "not set", never a parsed 0.
    expect(parseAdvancedFilters({ yearFrom: "" }).yearFrom).toBeUndefined();
  });

  it("clamps ratings to 0..10 and swaps an inverted range", () => {
    expect(parseAdvancedFilters({ ratingMin: "7.5" })).toMatchObject({ ratingMin: 7.5 });
    expect(parseAdvancedFilters({ ratingMin: "12" }).ratingMin).toBe(10);
    expect(parseAdvancedFilters({ ratingMax: "-3" }).ratingMax).toBe(0);
    expect(parseAdvancedFilters({ ratingMin: "9", ratingMax: "6" })).toMatchObject({
      ratingMin: 6,
      ratingMax: 9,
    });
    expect(parseAdvancedFilters({ ratingMin: "" }).ratingMin).toBeUndefined();
  });

  it("whitelists sort values and resolves relevance without a keyword", () => {
    expect(parseAdvancedFilters({ sortBy: "rating" }).sortBy).toBe("rating");
    expect(parseAdvancedFilters({ sortBy: "bogus" }).sortBy).toBe("popularity");
    expect(
      parseAdvancedFilters({ sortBy: "relevance", query: "matrix" }).sortBy,
    ).toBe("relevance");
    expect(parseAdvancedFilters({ sortBy: "relevance" }).sortBy).toBe("popularity");
  });

  it("trims the keyword", () => {
    expect(parseAdvancedFilters({ query: "  singin  " }).query).toBe("singin");
  });
});

describe("hasDegradingFilters", () => {
  it("is false without a keyword", () => {
    expect(
      hasDegradingFilters(
        parseAdvancedFilters({ genres: "action", sortBy: "rating", ratingMin: "7" }),
      ),
    ).toBe(false);
  });

  it("is false when the keyword is the only filter", () => {
    expect(hasDegradingFilters(parseAdvancedFilters({ query: "matrix" }))).toBe(false);
  });

  it("is true when a keyword coexists with discover-only filters", () => {
    expect(
      hasDegradingFilters(parseAdvancedFilters({ query: "matrix", genres: "action" })),
    ).toBe(true);
    expect(
      hasDegradingFilters(parseAdvancedFilters({ query: "matrix", sortBy: "newest" })),
    ).toBe(true);
    expect(
      hasDegradingFilters(parseAdvancedFilters({ query: "matrix", yearTo: "1999" })),
    ).toBe(true);
    // Relevance + popularity are not degradations — they mean the same here.
    expect(
      hasDegradingFilters(parseAdvancedFilters({ query: "matrix", sortBy: "popularity" })),
    ).toBe(false);
  });
});

describe("filtersToSearchParams", () => {
  it("omits defaults to keep URLs clean", () => {
    expect(filtersToSearchParams(parseAdvancedFilters({}))).toBe("");
  });

  it("serializes the non-default filter set", () => {
    const filters = parseAdvancedFilters({
      types: "movie",
      genres: "action,comedy",
      yearFrom: "1980",
      yearTo: "1999",
      ratingMin: "7",
      sortBy: "rating",
      query: "matrix",
    });
    expect(filtersToSearchParams(filters)).toBe(
      "types=movie&genres=action%2Ccomedy&yearFrom=1980&yearTo=1999&ratingMin=7&sortBy=rating&query=matrix",
    );
  });
});

describe("advancedHref", () => {
  it("builds a bare URL when nothing is set", () => {
    expect(advancedHref(parseAdvancedFilters({}), 1)).toBe("/search/advanced");
    expect(advancedHref(parseAdvancedFilters({}), 3)).toBe("/search/advanced?page=3");
  });

  it("preserves filters and appends the page after page 1", () => {
    const filters = parseAdvancedFilters({ genres: "action", sortBy: "rating" });
    expect(advancedHref(filters, 1)).toBe("/search/advanced?genres=action&sortBy=rating");
    expect(advancedHref(filters, 2)).toBe(
      "/search/advanced?genres=action&sortBy=rating&page=2",
    );
  });
});

describe("URL round-trip", () => {
  it("parse -> serialize -> parse is stable", () => {
    const filters = parseAdvancedFilters({
      types: "tv",
      genres: "action,horror",
      yearFrom: "1980",
      ratingMin: "6.5",
      sortBy: "newest",
      query: "",
    });
    const reparsed = parseAdvancedFilters(
      Object.fromEntries(new URLSearchParams(filtersToSearchParams(filters))),
    );
    expect(reparsed).toEqual(filters);
  });
});

import { describe, expect, it } from "vitest";
import { parsePageParam, TMDB_PAGE_LIMIT } from "@/lib/page-params";

describe("parsePageParam", () => {
  it("defaults missing and empty values to page 1", () => {
    expect(parsePageParam(undefined)).toBe(1);
    expect(parsePageParam("")).toBe(1);
    expect(parsePageParam([])).toBe(1);
  });

  it("parses positive integers; arrays use the first value", () => {
    expect(parsePageParam("4")).toBe(4);
    expect(parsePageParam(["7", "9"])).toBe(7);
  });

  it("returns page 1 for invalid values instead of erroring", () => {
    expect(parsePageParam("abc")).toBe(1);
    expect(parsePageParam("0")).toBe(1);
    expect(parsePageParam("-3")).toBe(1);
    expect(parsePageParam("3.9")).toBe(1);
  });

  it("clamps to the TMDB discover ceiling", () => {
    expect(parsePageParam("999999")).toBe(TMDB_PAGE_LIMIT);
    expect(parsePageParam("500")).toBe(500);
  });
});

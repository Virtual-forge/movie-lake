import { NextResponse, type NextRequest } from "next/server";
import { discoverMovies, discoverTv, searchMovies, searchTv } from "@/lib/api/tmdb";
import { toListingList } from "@/lib/normalize";
import type { Listing } from "@/types/listing";

/**
 * Live search endpoint over TMDB (movie + TV). Kind failures are isolated:
 * one kind failing never drops the other, so the UI can show a partial
 * results banner. The client (TanStack Query) owns the ~5 min freshness
 * budget, so responses are not server-cached. Route handlers are dynamic
 * by default under cacheComponents; no segment config needed.
 */

type Kind = "movie" | "tv";

interface KindResult {
  status: "ok" | "error";
  page: number;
  totalPages: number;
  total: number;
  listings: Listing[];
  error?: "tmdb_unavailable";
}

interface SearchBody {
  query: string;
  kinds: {
    movie: KindResult | null;
    tv: KindResult | null;
  };
}

const MAX_PAGE = 500; // TMDB hard cap

/**
 * Browse mode (M8): an empty/short query is no longer an empty screen —
 * it streams the discovery feed in the advanced page's default order
 * (popularity) with the same quality floor, so /search?kind=movie is a
 * "Movies" landing page before anything is typed.
 */
const BROWSE_MIN_VOTES = 10;

/**
 * Free streaming (M11): browse supports `monetization=free`, resolved at
 * the client boundary to JustWatch's free-or-ad-supported offer set
 * (verified live: docs list free|ads among watch_monetization_types;
 * pipe = OR). The region must ride along — TMDB errors without it. Text
 * search cannot monetization-filter (search endpoints ignore watch
 * params), so only the browse feed honors it and the UI says so.
 */
const FREE_MONETIZATION_TYPE_FILTER = "free|ads";
const FREE_WATCH_REGION = "US";
const SUPPORTED_MONETIZATION = new Set(["free"]);

interface BrowseFilter {
  watchMonetization?: string;
  watchRegion?: string;
}

function emptyResult(page = 1): KindResult {
  return { status: "ok", page, totalPages: 0, total: 0, listings: [] };
}

function wanted(kind: string, target: Kind): boolean {
  return kind === "all" || kind === target;
}

async function browseKind(
  target: Kind,
  page: number,
  filter: BrowseFilter = {},
): Promise<KindResult> {
  try {
    const options = { page, minVoteCount: BROWSE_MIN_VOTES, ...filter };
    const result =
      target === "movie"
        ? await discoverMovies(options)
        : await discoverTv(options);
    return {
      status: "ok",
      page: result.page ?? page,
      totalPages: Math.min(result.total_pages ?? 0, MAX_PAGE),
      total: result.total_results ?? 0,
      listings: toListingList(result.results, target),
    };
  } catch {
    return { ...emptyResult(page), status: "error", error: "tmdb_unavailable" };
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const query = (searchParams.get("q") ?? "").trim();
  const kind = searchParams.get("kind") ?? "all";
  const rawPage = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const page = Number.isFinite(rawPage) ? Math.min(Math.max(rawPage, 1), MAX_PAGE) : 1;
  const rawMonetization = searchParams.get("monetization");

  if (!["all", "movie", "tv"].includes(kind)) {
    return NextResponse.json({ error: "invalid kind" }, { status: 400 });
  }
  if (rawMonetization !== null && !SUPPORTED_MONETIZATION.has(rawMonetization)) {
    return NextResponse.json({ error: "invalid monetization" }, { status: 400 });
  }
  // The client resolves the URL kind=free tab into per-kind requests, so the
  // route only ever sees kind=movie|tv plus this browse-only filter.
  const browseFilter: BrowseFilter =
    rawMonetization === "free"
      ? {
          watchMonetization: FREE_MONETIZATION_TYPE_FILTER,
          watchRegion: FREE_WATCH_REGION,
        }
      : {};

  const body: SearchBody = {
    query,
    kinds: { movie: null, tv: null },
  };

  if (query.length < 2) {
    await Promise.all(
      ([
        wanted(kind, "movie") && ("movie" as Kind),
        wanted(kind, "tv") && ("tv" as Kind),
      ].filter(Boolean) as Kind[]).map(async (target) => {
        body.kinds[target] = await browseKind(target, page, browseFilter);
      }),
    );
    return NextResponse.json(body, { headers: { "cache-control": "no-store" } });
  }

  await Promise.all(
    ([
      wanted(kind, "movie") && "movie",
      wanted(kind, "tv") && "tv",
    ].filter(Boolean) as Kind[]).map(async (target) => {
      try {
        const result =
          target === "movie" ? await searchMovies(query, page) : await searchTv(query, page);
        body.kinds[target] = {
          status: "ok",
          page: result.page ?? page,
          totalPages: Math.min(result.total_pages ?? 0, MAX_PAGE),
          total: result.total_results ?? 0,
          listings: toListingList(result.results, target),
        };
      } catch {
        body.kinds[target] = {
          ...emptyResult(page),
          status: "error",
          error: "tmdb_unavailable",
        };
      }
    }),
  );

  return NextResponse.json(body, { headers: { "cache-control": "no-store" } });
}

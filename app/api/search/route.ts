import { NextResponse, type NextRequest } from "next/server";
import { searchMovies, searchTv } from "@/lib/api/tmdb";
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

function emptyResult(page = 1): KindResult {
  return { status: "ok", page, totalPages: 0, total: 0, listings: [] };
}

function wanted(kind: string, target: Kind): boolean {
  return kind === "all" || kind === target;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const query = (searchParams.get("q") ?? "").trim();
  const kind = searchParams.get("kind") ?? "all";
  const rawPage = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const page = Number.isFinite(rawPage) ? Math.min(Math.max(rawPage, 1), MAX_PAGE) : 1;

  if (!["all", "movie", "tv"].includes(kind)) {
    return NextResponse.json({ error: "invalid kind" }, { status: 400 });
  }

  const body: SearchBody = {
    query,
    kinds: { movie: null, tv: null },
  };

  if (query.length < 2) {
    body.kinds.movie = wanted(kind, "movie") ? emptyResult(page) : null;
    body.kinds.tv = wanted(kind, "tv") ? emptyResult(page) : null;
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

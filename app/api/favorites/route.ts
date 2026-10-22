import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { parseFavoriteRoute } from "@/lib/favorites";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Favorites CRUD for the signed-in user. Guests receive 401 — the UI keeps
 * favorites honest by prompting sign-in instead of pretending to persist.
 * Request bodies are parsed server-side: the route string alone decides
 * where a favorite points, never the client's source/type claims.
 */

/**
 * TMDB poster path (starts with "/"). Same charset TMDB itself uses; the
 * full URL is rebuilt at render time via tmdbImageUrl.
 */
const posterPathSchema = z
  .string()
  .max(200)
  .regex(/^\/[A-Za-z0-9\-._~:\/]+$/, "posterPath must be a TMDB image path");

const postBodySchema = z.object({
  itemId: z
    .string()
    .max(100)
    .regex(/^\/(movie|tv)\/\d+$/, "itemId must be a movie/tv route"),
  title: z.string().min(1).max(300),
  posterPath: posterPathSchema.optional(),
  genres: z.array(z.string().min(1).max(50)).max(10).optional(),
  year: z.number().int().min(1870).max(2100).optional(),
});

function unauthorized() {
  return NextResponse.json(
    { error: "Sign in to manage favorites." },
    { status: 401 },
  );
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      type: true,
      externalId: true,
      title: true,
      posterPath: true,
      genres: true,
      year: true,
      createdAt: true,
    },
  });

  return NextResponse.json(
    favorites.map((favorite) => ({
      id: favorite.id,
      itemId: `/${favorite.type === "MOVIE" ? "movie" : "tv"}/${favorite.externalId}`,
      type: favorite.type,
      title: favorite.title,
      posterPath: favorite.posterPath,
      genres: favorite.genres,
      year: favorite.year,
      createdAt: favorite.createdAt.toISOString(),
    })),
  );
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const limit = rateLimit(`favorites:post:${user.id}`, { limit: 30 });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many favorite updates — try again in a minute." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const body = postBodySchema.safeParse(json);
  if (!body.success) {
    return NextResponse.json(
      { error: `Invalid favorite payload: ${body.error.issues[0]?.message}` },
      { status: 400 },
    );
  }

  // The route string is the single source of truth for source/type/id.
  const target = parseFavoriteRoute(body.data.itemId);
  if (!target) {
    return NextResponse.json({ error: "Unknown item route." }, { status: 400 });
  }

  const saved = await prisma.favorite.upsert({
    where: {
      userId_source_type_externalId: {
        userId: user.id,
        source: target.source,
        type: target.type,
        externalId: target.externalId,
      },
    },
    create: {
      userId: user.id,
      source: target.source,
      type: target.type,
      externalId: target.externalId,
      title: body.data.title,
      posterPath: body.data.posterPath,
      genres: body.data.genres ?? [],
      year: body.data.year,
    },
    // Refresh the snapshot in case the listing was re-rendered since.
    update: {
      title: body.data.title,
      posterPath: body.data.posterPath,
      genres: body.data.genres ?? [],
      year: body.data.year,
    },
    select: { id: true, type: true, externalId: true },
  });

  return NextResponse.json(
    {
      id: saved.id,
      itemId: `/${saved.type === "MOVIE" ? "movie" : "tv"}/${saved.externalId}`,
    },
    { status: 200 },
  );
}

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const limit = rateLimit(`favorites:delete:${user.id}`, { limit: 30 });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many favorite updates — try again in a minute." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const itemId = new URL(request.url).searchParams.get("itemId");
  if (!itemId) {
    return NextResponse.json(
      { error: "Missing itemId query parameter." },
      { status: 400 },
    );
  }
  const target = parseFavoriteRoute(itemId);
  if (!target) {
    return NextResponse.json({ error: "Unknown item route." }, { status: 400 });
  }

  await prisma.favorite.deleteMany({
    where: {
      userId: user.id,
      source: target.source,
      type: target.type,
      externalId: target.externalId,
    },
  });
  return NextResponse.json({ ok: true }, { status: 200 });
}

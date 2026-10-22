# Movie Lake

A cinematic discovery index for movies and series. Server-rendered Next.js 16
front end over the TMDB engine, with server-backed favorites, a curated
public-domain watch page, and honest labels everywhere: real data only, no
fabricated ratings, and attribution where data comes from.

**This is a design-study demo, not a streaming service.** Full films appear
only for curated, license-verified titles (public domain / CC) covered by the
Internet Archive; everything else gets trailers and retail options.

## Stack

- Next.js 16.4.2 (Turbopack, `cacheComponents` + partial prefetching), React 19
- Tailwind v4, TanStack Query v5, Zod v4
- Better Auth 1.7 (email/password; Google activates when credentials exist)
- Prisma 7 (engineless driver adapter) + Postgres (Docker locally, Neon in prod)
- Vitest units + Playwright e2e against a running dev server

## Local setup

```bash
pnpm install
cp .env.example .env.local        # fill in TMDB_API_READ_TOKEN + BETTER_AUTH_SECRET
cp .env.example .env              # DATABASE_URL + BETTER_AUTH_URL (localhost:3000)
docker compose up -d              # Postgres on :5433
pnpm exec prisma migrate deploy   # or: prisma migrate dev
pnpm exec prisma db seed          # curated FreeFilm rows (license-verified)
pnpm dev
```

Gates: `pnpm exec tsc --noEmit` · `pnpm lint` · `pnpm test` · `pnpm build` ·
`pnpm exec playwright test` (expects the dev server on :3000).

## Deploying (Vercel + Neon)

1. Import this repo in Vercel ("Add New Project"), framework auto-detected.
2. Environment variables (all environments):
   - `TMDB_API_READ_TOKEN` — TMDB "API Read Access Token" (JWT)
   - `DATABASE_URL` — Neon **pooled** connection string
   - `BETTER_AUTH_SECRET` — generate fresh: `openssl rand -base64 32`
   - `BETTER_AUTH_URL` — your production URL (previews: `https://${VERCEL_URL}`)
3. First boot with empty data: run `pnpm exec prisma migrate deploy` (and,
   if you want the curated free films, `pnpm exec prisma db seed`) against
   the Neon URL from a machine with the repo checked out.
4. Deploy → watch page, favorites, search all run on real data.

## Content policy

- Real data only; nothing invented; sources labeled (TMDB, JustWatch,
  Internet Archive).
- Free full films are seeded entries with a recorded license basis and
  verification date (`prisma/seed.ts`); public-domain claims are US-only and
  auditable.
- No unlicensed stream embeds, ever.

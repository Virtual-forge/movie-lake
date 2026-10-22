# Next.js Listings Website - Project Plan (Revision 2)

## 🎯 Project Overview
A modern Next.js application for browsing and managing listings (movies, TV series, books) with user authentication, favorites, and search.

**MVP scope:** TMDB (movies + TV) and Google Books, email/password + Google login, favorites with genre filters, basic and advanced search, detail pages, and a movie watch page (trailers, where-to-watch, and full playback for legally free titles).
**Deferred to post-MVP:** Open Library, GitHub OAuth, saved searches, Watchlist/History, Google Books (deferred October 2026 by product decision — the site ships movies + TV only).

### Revision notes (what changed from v1)
- Next.js 16 (`proxy.ts` replaces `middleware.ts`); Better Auth replaces Auth.js v5 (beta, now security-only maintenance).
- Postgres from day one (SQLite doesn't support `String[]`); `Favorite` gets a `source` column.
- Added: detail pages, canonical genre mapping, per-type filter capability matrix, partial-failure handling, testing/CI, TMDB attribution.
- Corrected TMDB limits; Open Library, GitHub OAuth, saved searches, Watchlist/History, and homepage stats moved out of the MVP.
- Phases rebuilt as a vertical slice (TMDB first, books second).
- Added a watch page: trailers, region-aware "where to watch", and full playback only for legally free titles (no unlicensed streams).

---

## 📡 API Options & Recommendations

### Chosen for MVP: TMDB + Google Books
| API | Type | Cost / Limits | Key Features |
|-----|------|---------------|--------------|
| **TMDB (The Movie Database)** | Movies & TV | Free for **non-commercial** use with attribution. The old 40 req/10s limit was disabled in 2019, but still throttle and cache. | 1M+ titles, genres, images, ratings, search, discover |
| **Google Books API** | Books | Free, default quota ~1000 req/day (needs an API key) | Search, previews, categories, ISBN lookup |

### Post-MVP: Open Library
| API | Type | Notes |
|-----|------|-------|
| **Open Library** | Books | Free but not truly unlimited: send an identifying `User-Agent` and throttle. Add only if Google Books has cover/data gaps. Dedupe against Google Books by ISBN/work. |

### Not recommended
- **OMDB / TVMaze:** each covers only part of the domain (OMDB: movies, no TV; TVMaze: TV only).
- No single free API covers books + movies + TV well.

### TMDB compliance (required)
- Show the TMDB logo and this notice in the footer: *"This product uses the TMDB API but is not endorsed or certified by TMDB."* The logo must be less prominent than the app's own branding and must not be altered.
- Free tier is non-commercial only; a commercial launch needs an agreement with TMDB.
- TMDB's terms limit caching of its data to six months. Favorite snapshots refresh lazily when older than that (see `Favorite.updatedAt`).

### Playback & watch data
TMDB is metadata only: it doesn't host or license video, and no free API legally streams arbitrary movies. The watch page therefore uses three legitimate sources, in this order:

| Tier | Source | What the user gets |
|------|--------|--------------------|
| 1. Full playback | Internet Archive embed (`archive.org/embed/{identifier}`) for a **curated** set of public-domain / openly licensed films (e.g. *Nosferatu* 1922, *A Trip to the Moon*, Blender open movies like *Big Buck Bunny*) | Whole film plays in-page |
| 2. Trailer | TMDB `/movie/{id}/videos` (filter `site=YouTube`, `type=Trailer`, prefer official) → `youtube-nocookie.com` embed | Trailer for any movie/TV |
| 3. Where to watch | TMDB `/movie/{id}/watch/providers` (and `/tv/{id}/...`), by region | Streaming / rent / buy providers with outbound links |

Rules:
- No embeds from unlicensed streaming sites. That is copyright infringement and a legal/takedown risk for the site and its host.
- Watch-provider data comes from JustWatch; credit JustWatch wherever providers are shown.
- Public-domain status varies by country. Store the license with each free film, show it on the watch page, and verify every title before adding it.
- If you later license your own content, add a `self-hosted` tier (HLS via Mux/Cloudflare Stream) behind the same `Player` component.

---

## 🏗️ Technical Architecture

### Tech Stack
- **Framework:** Next.js 16 (App Router, Server Components), Node 20.9+
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Data fetching:** Server Components for initial loads; TanStack Query for client refinement (single library; no SWR)
- **Auth:** Better Auth (Prisma adapter) with email/password + Google OAuth
- **Database:** PostgreSQL from day one via Prisma (Docker Compose locally, Neon in production)
- **API layer:** Route Handlers / Server Actions
- **Caching:** Next.js server-side caching (search ~5 min, trending ~1 h, details ~24 h)
- **Forms:** React Hook Form + Zod
- **Env validation:** Zod schema in `lib/env.ts` (fail fast on missing keys)
- **Rate limiting:** Upstash Ratelimit (login, register, favorites, search)
- **Testing:** Vitest (normalizers, genre mapping, filter logic) + Playwright (login → favorite → profile)
- **CI:** GitHub Actions: lint, typecheck, unit tests

### Project Structure
```
src/
├── app/
│   ├── (auth)/                  # Auth route group
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/             # Protected routes
│   │   └── profile/
│   │       └── page.tsx         # Favorites; genre/type filters via URL params
│   ├── movie/[id]/page.tsx      # Movie detail (TMDB)
│   ├── movie/[id]/watch/page.tsx  # Watch page: free film / trailer / where to watch
│   ├── tv/[id]/page.tsx         # TV detail (TMDB)
│   ├── book/[id]/page.tsx       # Book detail (Google Books)
│   ├── api/
│   │   ├── auth/[...all]/       # Better Auth handler
│   │   ├── favorites/
│   │   ├── search/
│   │   └── listings/
│   ├── genres/
│   │   └── [slug]/
│   ├── search/
│   │   ├── page.tsx             # Basic search
│   │   └── advanced/
│   ├── layout.tsx               # Root layout with header + footer
│   └── page.tsx                 # Home page
├── components/
│   ├── ui/                      # shadcn/ui components
│   ├── layout/
│   │   └── Footer.tsx           # Includes TMDB attribution
│   ├── watch/
│   │   ├── FreeFilmPlayer.tsx   # Internet Archive embed (curated free films)
│   │   ├── TrailerEmbed.tsx     # YouTube (nocookie) trailer
│   │   └── WhereToWatch.tsx     # Region-aware providers + JustWatch credit
│   ├── header/
│   │   ├── Header.tsx
│   │   ├── SearchBar.tsx
│   │   ├── NavLinks.tsx
│   │   └── UserMenu.tsx
│   ├── listings/
│   │   ├── ListingCard.tsx
│   │   ├── ListingGrid.tsx
│   │   ├── ListingFilters.tsx
│   │   ├── GenreFilter.tsx
│   │   ├── TypeTabs.tsx
│   │   └── FavoriteButton.tsx
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── RegisterForm.tsx
│   └── profile/
│       ├── FavoritesList.tsx
│       └── GenreFilterTabs.tsx
├── lib/
│   ├── api/                     # External API clients
│   │   ├── tmdb.ts
│   │   ├── google-books.ts      # (open-library.ts added post-MVP)
│   │   └── internet-archive.ts  # Embed IDs for curated free films
│   ├── genres.ts                # Canonical genre taxonomy + per-source mapping
│   ├── normalize.ts             # Source responses → UnifiedListing
│   ├── auth.ts                  # Better Auth server config
│   ├── auth-client.ts           # Better Auth client
│   ├── dal.ts                   # requireUser(): session check for handlers/actions
│   ├── db.ts                    # Prisma client
│   ├── env.ts                   # Zod-validated env
│   ├── rate-limit.ts
│   ├── utils.ts
│   └── validations.ts           # Zod schemas
├── hooks/
│   ├── useFavorites.ts
│   ├── useSearch.ts
│   └── useDebounce.ts
├── types/
│   ├── listing.ts
│   ├── user.ts
│   └── api.ts
└── proxy.ts                     # Optimistic auth redirect (replaces middleware.ts)
prisma/schema.prisma
e2e/                             # Playwright tests
```

---

## 🎨 UI/UX Design Plan

### Color Scheme & Theme
- **Primary:** Indigo/Blue (`indigo-600`) - Trust, media/entertainment feel
- **Secondary:** Amber/Orange (`amber-500`) - Accent for favorites, CTAs
- **Dark Mode:** Full support via `next-themes`
- **Typography:** Inter (UI) + Merriweather (content headings)

### Key Pages

#### 1. Home Page (`/`)
- Hero section with featured/trending listings
- Category strips: "Trending Movies", "Popular TV Shows", "Top Books"
- Quick search bar (prominent)

#### 2. Auth Pages (`/login`, `/register`)
- Clean centered card layout
- Google login button
- Email/password with validation
- Redirect to intended page after auth

#### 3. Header (Persistent)
```
[Logo]  [Home] [Genres ▼] [Advanced Search] [________Search________] [User Avatar ▼]
```
- **Home:** Links to `/`
- **Genres:** Dropdown of the curated canonical genre list (static, see "Canonical Genres")
- **Advanced Search:** Links to `/search/advanced`
- **Search Bar:** Debounced (300 ms, min 2 characters), navigates with `router.replace` to `/search?q=...`
- **User Menu:** Profile, Logout

#### 4. Detail Pages (`/movie/[id]`, `/tv/[id]`, `/book/[id]`)
- Poster/cover, title, year, normalized rating (if available), genres, overview
- Type-specific info: runtime / seasons (movie/TV), authors / page count (books)
- **Favorite button** (prompts login if signed out)
- **Trailer** and **Where to watch** panels (movies and TV); movies also get a **Watch** button linking to the watch page
- SEO metadata generated per page
- Every `ListingCard` links here

#### 5. Watch Page (`/movie/[id]/watch`)
- Movies only. TV detail pages get the trailer and Where to watch panels (no episode player in the MVP).
- Shows the best available option for the title:
  1. **Free film:** if the movie is in the curated `FreeFilm` table, embed the full film (Internet Archive player) with its license and source shown below.
  2. **Otherwise:** trailer embed plus **Where to watch** (streaming / rent / buy, with outbound links). Region defaults to the visitor's country (request geo header, fallback US) with a manual selector.
- Labels make the content clear: "Full film (public domain)" vs "Trailer".
- JustWatch credit next to the providers list; 404 for non-movie IDs.
- The detail page button reads "Watch" for free films, otherwise "Trailer & where to watch".

#### 6. Genres Page (`/genres/[slug]`)
- Grid of listings for one canonical genre, with **type tabs** (Movies | TV | Books), each paginated independently
- Sidebar sub-filters where the source supports them (year/rating for TMDB types only)

#### 7. Basic Search (`/search?q=...`)
- Default "All" view: top results per type (mixed, with type badges 🎬 📺 📚)
- Type tabs (Movies | TV | Books) with independent pagination
- Sort: Relevance, Newest, Title (Rating/Popularity only for TMDB types)
- Partial-failure banner if a source is down (e.g. "Books temporarily unavailable")

#### 8. Advanced Search (`/search/advanced`)
- **Type select:** Movie / TV / Book (multi-select)
- **Genre multi-select** (canonical genres, chips)
- **Year range** and **rating range** sliders: shown only for TMDB types, hidden when only Book is selected
  (Shipped Oct 2026 as paired number inputs instead of sliders — exact values, reflects state server-side, works without JavaScript; consistent with the plan's cut order that ranked sliders first.)
- **Sort** dropdown limited to what the selected type supports
- **Keyword** text input
- See the capability matrix below

#### 9. Profile Page (`/profile`)
- **Favorites** (MVP). Watchlist/History/Settings are post-MVP.
- Grid of favorited items with **genre filter tabs** (All + genres present in favorites) and **type filter** (Movie/TV/Book), driven by URL params (`?genre=&type=`)
- Remove-from-favorites button (optimistic)
- Empty state with CTA to browse

---

## 🔐 Authentication & Authorization

### Auth Providers (MVP)
1. **Email/Password** (Better Auth `emailAndPassword`)
2. **Google OAuth**

GitHub OAuth is post-MVP.

### Setup notes
- Server config in `lib/auth.ts`: `betterAuth` with the Prisma adapter, `emailAndPassword` enabled, Google in `socialProviders`, and the Next.js cookies plugin so Server Actions can set cookies.
- Route handler at `app/api/auth/[...all]/route.ts`.
- Generate the auth tables with the Better Auth CLI (user, session, account, verification), then add the `Favorite` relation to `User`. Don't hand-maintain `provider`/`providerId` columns; the `account` table handles linking.
- Verify config details against the current Better Auth docs when implementing.

### Protected Routes
- **`proxy.ts`:** optimistic redirect only (cookie check) for `/profile/*`. This is a UX shortcut, not security.
- **Real enforcement:** `requireUser()` in `lib/dal.ts` (reads the session via `auth.api.getSession`), called in every page, route handler, and Server Action that touches user data.
- `/api/favorites/*` returns 401 without a valid session.

### Data Models (Prisma)
```prisma
// Better Auth generates: User, Session, Account, Verification
// Add to User:   favorites Favorite[]

enum Source {
  TMDB
  GOOGLE_BOOKS
  OPEN_LIBRARY   // post-MVP
}

enum MediaType {
  MOVIE
  TV
  BOOK
}

model Favorite {
  id         String    @id @default(cuid())
  userId     String
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  source     Source
  type       MediaType
  externalId String    // ID within the source (TMDB ID, Google Books volume ID)
  title      String
  posterPath String?   // path only; build the full URL at render time
  genres     String[]  // canonical genre slugs (requires Postgres)
  year       Int?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt   // snapshot freshness; refresh lazily

  @@unique([userId, source, type, externalId])
  @@index([userId, createdAt])
}
```
Ratings are not stored on favorites (they go stale); fetch them on the detail page.

```prisma
// Curated seed of legally free films (public domain / open license)
model FreeFilm {
  tmdbId            Int      @id
  archiveIdentifier String   @unique   // Internet Archive item ID for the embed URL
  license           String             // e.g. "Public domain (US)", "CC BY 3.0"
  licenseUrl        String?
  notes             String?
  createdAt         DateTime @default(now())
}
```
Seeded from `prisma/seed.ts` using a reviewed list (start with 10-20 titles). Verify each license before adding an entry.

---

## 🧭 Canonical Genres

TMDB uses fixed genre IDs (and different lists for movies and TV), while Google Books categories are free-form strings and the API has no genre-list endpoint. Genre dropdown, `/genres/[slug]`, advanced-search chips, and profile tabs all depend on one canonical taxonomy defined in `lib/genres.ts`.

- **Slug** is the canonical key (e.g. `science-fiction`), stored in `Favorite.genres` and used in URLs.
- Each slug maps to zero or more TMDB movie genres, TMDB TV genres, and Google Books subject terms.
- Resolve TMDB genre IDs from `/genre/movie/list` and `/genre/tv/list` by name at build/seed time rather than hardcoding IDs.
- Mapping is many-to-many (TMDB TV's "Sci-Fi & Fantasy" maps to both `science-fiction` and `fantasy`).
- Unmapped source genres are dropped from the UI (but kept in the raw response if needed).

Starter mapping (tune after testing against real responses):

| Slug | TMDB Movie | TMDB TV | Google Books subject |
|------|-----------|---------|----------------------|
| `action` | Action | Action & Adventure | `action` |
| `adventure` | Adventure | Action & Adventure | `adventure` |
| `comedy` | Comedy | Comedy | `humor` |
| `crime` | Crime | Crime | `crime` |
| `drama` | Drama | Drama | `drama` |
| `fantasy` | Fantasy | Sci-Fi & Fantasy | `fantasy` |
| `science-fiction` | Science Fiction | Sci-Fi & Fantasy | `science fiction` |
| `mystery` | Mystery | Mystery | `mystery` |
| `romance` | Romance | n/a | `romance` |
| `horror` | Horror | n/a | `horror` |
| `thriller` | Thriller | n/a | `thriller` |
| `history` | History | n/a | `history` |
| `documentary` | Documentary | Documentary | `biography` |

---

## 🔍 Search & Filtering Logic

### Basic Search
- Debounced 300 ms, minimum 2 characters, `AbortController` cancels in-flight requests, results cached server-side per query.
- `/api/search` calls TMDB and Google Books in parallel with `Promise.allSettled` and a per-call timeout (~5 s).
- Response shape: `{ results, errors: { [source]: message } }` so the UI can show partial results plus a banner.
- "All" view returns the top N per type (mixed). Per-type tabs paginate independently.
- Deduplication applies only within the same type (e.g. Google Books vs Open Library after Open Library is added), keyed by ISBN/work.
- Don't sort mixed results by rating; book ratings are sparse and on a different scale.

### Advanced Search
- **Client:** build a filter object → URL search params.
- **Server:** route handler translates app-level filters into per-source calls.
- **App-level sort values:** `relevance | popularity | rating | newest | title`, mapped to source-specific values inside each API client (no TMDB strings in the URL).
- **Filters:** `types`, `genres` (canonical slugs), `yearFrom`, `yearTo`, `ratingMin`, `ratingMax`, `sortBy`, `query`.

#### Capability matrix
| Filter | Movie / TV (TMDB) | Book (Google Books) |
|--------|-------------------|---------------------|
| Keyword | ✅ search endpoints | ✅ `q=` |
| Genre | ✅ `with_genres` | ✅ `subject:` term |
| Year range | ✅ release / first-air date range | ❌ no native filter (hidden in UI) |
| Rating range | ✅ `vote_average`, with a min `vote_count` | ❌ (hidden in UI) |
| Sort | relevance, popularity, rating, newest, title | relevance, newest |

Unsupported filters are hidden or disabled when only unsupported types are selected. If mixed types are selected, the unsupported filter applies to TMDB types only, and the UI says so.

Verified against the live TMDB API (Oct 2026): the `/search/movie|tv` endpoints silently ignore `with_genres`, `vote_average.*`, sort and date-range params, and `/discover/*` takes no query parameter. So a keyword demotes a request to pure source-ranked relevance — the discover-only filters ride along in the URL, apply again on keyword clear, and the results page shows a banner stating exactly this. The Book column stays as designed for when books return.

### Pagination
- Each type paginates independently (page-based for TMDB, `startIndex` for Google Books). No cross-source merged infinite scroll in the MVP.

### Genre Filtering (Profile Favorites)
- Derive unique canonical genres from the user's favorites.
- Render as horizontal scrollable tabs; filtering is client-side and instant, synced to `?genre=`.
- "All" tab shows everything.

---

## 📦 API Integration Details

### TMDB Client (`lib/api/tmdb.ts`)
```typescript
// Base: https://api.themoviedb.org/3  (Bearer token auth)
// Endpoints needed:
// - /search/movie, /search/tv
// - /discover/movie, /discover/tv (genre, year, rating filters)
// - /genre/movie/list, /genre/tv/list
// - /movie/{id}, /tv/{id} (details)
// - /trending/{media_type}/{time_window}
// - /movie/{id}/videos, /tv/{id}/videos (trailers; YouTube keys)
// - /movie/{id}/watch/providers, /tv/{id}/watch/providers (by region; JustWatch data)
// - /configuration (image base URL / sizes)
// Images: image.tmdb.org (add to next.config images.remotePatterns)
```

### Google Books Client (`lib/api/google-books.ts`)
```typescript
// Base: https://www.googleapis.com/books/v1  (API key required)
// Endpoints:
// - /volumes?q=...&startIndex=...  (search; use subject: for genres)
// - /volumes/{id}  (details)
// Covers: books.google.com (add to remotePatterns). Categories are free-form; map via lib/genres.ts.
```

### Internet Archive Client (`lib/api/internet-archive.ts`)
```typescript
// Used only for curated FreeFilm entries.
// - Embed:    https://archive.org/embed/{identifier}   (rendered in an iframe)
// - Metadata: https://archive.org/metadata/{identifier} (optional sanity check at seed time)
// Add archive.org to CSP frame-src.
```

### Open Library Client (post-MVP)
```typescript
// Base: https://openlibrary.org
// - /search.json?q=...   - /works/{id}.json   - /subjects/{subject}.json
// Fallback/augmentation for Google Books. Send a User-Agent; throttle requests.
// Covers: covers.openlibrary.org
```

### Unified Listing Type
```typescript
type Source = 'tmdb' | 'google_books';          // 'open_library' post-MVP
type MediaType = 'movie' | 'tv' | 'book';

// Canonical identity: the triple below. The string form is derived
// (`${source}:${type}:${externalId}`) for React keys only.
// Routes use the externalId: /movie/[id], /tv/[id], /book/[id] (source is implied by type).
interface ListingRef {
  source: Source;
  type: MediaType;
  externalId: string;
}

interface UnifiedListing extends ListingRef {
  title: string;
  originalTitle?: string;
  overview?: string;
  posterUrl?: string;       // placeholder image when missing
  backdropUrl?: string;
  genres: string[];         // canonical slugs
  year?: number;
  rating?: number;          // 0-10 normalized (Google Books 1-5 ×2); undefined if absent
  voteCount?: number;
  runtime?: number;         // movies
  seasons?: number;         // tv
  pageCount?: number;       // books
  authors?: string[];       // books
  creators?: string[];      // tv
  externalIds: {
    tmdb?: number;
    imdb?: string;
    isbn?: string;
    googleBooks?: string;
  };
}
```

### Watch Info Type
```typescript
interface Provider { id: number; name: string; logoPath?: string }

interface WatchInfo {
  freeFilm?: { archiveIdentifier: string; license: string; licenseUrl?: string };
  trailer?: { youtubeKey: string; name: string };
  providers?: {
    region: string;          // ISO 3166-1, e.g. "MA"
    link?: string;           // TMDB/JustWatch landing page
    flatrate?: Provider[];
    rent?: Provider[];
    buy?: Provider[];
  };
}
```

### Error handling
- Every client uses `AbortSignal.timeout`, maps non-2xx responses to typed errors, and never throws into the page: failures surface through the `errors` map and UI banners.
- Normalizers (`lib/normalize.ts`) tolerate missing fields; each has unit tests with recorded fixture responses.

---

## 🛡️ Security, Quality & Compliance
- Rate limit login, register, favorites, and search endpoints from Phase 1/2 (not only at the end).
- Validate all inputs with Zod; validate env at boot.
- Disable automatic account linking by email unless the provider verifies the email.
- TMDB attribution in the footer from Phase 1.
- Accessibility pass on cards, filters, and tabs (keyboard + labels).
- Search result pages are `noindex`; detail and genre pages are the SEO surface.
- CSP `frame-src` limited to `youtube-nocookie.com` and `archive.org`; iframes use `sandbox`/`allow` attributes; no third-party streaming embeds.
- Outbound provider links use `rel="noopener noreferrer"`.

---

## 🗓️ Implementation Phases

Built as a vertical slice: TMDB end-to-end first, then add books.

### Phase 1: Foundation (Week 1)
- [x] Next.js 16 + TypeScript + Tailwind setup
- [~] shadcn/ui setup — skipped by deviation; hand-rolled Tailwind components instead (M1)
- [x] Docker Compose Postgres + Prisma schema + migrations (M2: published on 5433 — a native Windows
      PostgreSQL 16 service already owns 5432 on the dev machine; Better Auth CLI generated auth
      tables, `Favorite` added per data model, migration `20261021225753_init`)
- [x] `lib/env.ts` (Zod) and `.env.example` (M1 TMDB; M2 DATABASE_URL/BETTER_AUTH_SECRET/optional Google)
- [x] Better Auth (email/password + Google *conditional on credentials existing*), route handler,
      `proxy.ts` (optimistic `/profile` cookie redirect), `requireUser()` — Google provider activates
      automatically once GOOGLE_CLIENT_ID/SECRET land in env; not available yet
- [x] Header, Footer with TMDB attribution, `next/image` `remotePatterns`
- [~] CI (lint, typecheck, tests) — local quality gates only (repo not hosted yet); GitHub CI comes with the deploy milestone

### Phase 2: TMDB Slice (Week 1-2)
- [x] TMDB client + normalizer + Vitest fixtures
- [x] `lib/genres.ts` with TMDB mapping
- [x] `/api/search` (TMDB only) and basic search page
- [x] Home page trending sections
- [x] `ListingCard` / `ListingGrid` and movie/TV detail pages
- [x] Trailer embed and Where-to-watch panel on movie/TV detail pages (TMDB videos + watch providers, JustWatch credit)
      — M3 (Oct 2026): embedded youtube-nocookie dialog player (`components/trailer-trigger.tsx`, overlay portaled to
      body so the sticky header can't intercept clicks; no-JS fallback keeps the YouTube watch link), US watch panel
      (`components/watch-panel.tsx`: stream/rent/buy slices, display-priority sort, log-size dedupe, TMDB "see all
      offers" deep link), JustWatch credit in the panel and footer, and the TMDB external link fixed to point at the
      title's own `/movie|tv/{id}` page; fixtures `movie-details-693134.json` / `tv-details-1396.json` + unit tests,
      e2e `e2e/watch.spec.ts` (trailer dialog open/close, panel + credit, series slices with rent omitted).
      Deviation: US region only for now — no request-geo detection or manual region selector yet (Phase 2 spec line).
- [x] Login/Register pages (M2: client forms via better-auth react store; redirect target sanitized in `lib/redirect.ts`)
- [x] Favorites API (CRUD) + `FavoriteButton` with optimistic updates (M2: `/api/favorites` GET/POST/DELETE,
      server-backed, localStorage seam removed; guests are prompted to sign in)
- [x] Profile page with favorites grid, genre tabs, type filter (M2: URL-param filters, snapshot cards,
      optimistic remove via useOptimistic)
- [x] Rate limiting on auth and favorites endpoints (M2: Better Auth built-in limiter for auth verbs;
      favorites writes via in-memory window limiter marked for the Upstash swap at deploy)

### Phase 3: Books (Week 2) — DEFERRED post-MVP (Oct 2026)
- [ ] Google Books client + normalizer + tests
- [ ] Book genre mapping and book detail page
- [ ] Extend `/api/search` with `Promise.allSettled` and error banner
- [ ] "All" mixed view and per-type tabs

### Phase 4: Browse, Watch & Advanced Search (Week 2-3)
- [x] Genre browsing page (`/genres/[slug]`) with per-type tabs and pagination
      — M4 (Oct 2026): URL-param kind tabs (`/genres/{slug}?kind=movie|tv`, "All" combined view default;
      `nav` + `aria-current` semantics like the profile filters), per-kind `PaginationNav` links
      (`components/pagination-nav.tsx`, windowed numbers, Prev/Next, current-pill), paged discover accessors
      `getGenreMoviesPage/getGenreSeriesPage` (`use cache` per page; TMDB `page`/`total_pages` surfaced honestly,
      clamped to the API's 500-page ceiling), Series tab hidden when the canonical mapping has no TV id
      (e.g. horror/musical), honest per-kind empty/unmapped states; `lib/page-params.ts` strict parse helper
      (arrays + invalid + out-of-range) with unit tests, e2e tabs/pagination routes added
- [x] Advanced search page with the capability matrix and URL-param filters
      — M5 (Oct 2026): `/search/advanced` server page with a plain HTML GET form — every filter set is a
      shareable URL and the page works without JavaScript; unchecked types fall back to both (stated in
      the legend). URL contract stays app-level (`types|genres|yearFrom|yearTo|ratingMin|ratingMax|sortBy|
      query`; TMDB strings mapped inside `lib/api/tmdb.ts` per the sort rule). `lib/search-filters.ts` is
      the pure parse/serialize/href layer with unit tests: unknown slugs/sorts dropped, inverted year and
      rating ranges swapped, defaults omitted from URLs, comma-joined and repeated form params
      (`genres=action&genres=comedy`) both normalized. `getAdvancedKindPage` (`use cache` per kind) — a
      keyword switches to the search endpoints (source-ranked relevance; discover-only filters laid aside
      + a capability banner says so), keyword-free goes to discover with the canonical-genre pipe union,
      year/rating ranges and `vote_count.gte=10`; Films/Series sections share one `page` param and the
      pagination covers the min of active kinds (an overshot page shows an honest per-kind empty state).
      Range filters shipped as paired number inputs, not sliders (values render server-side, no-JS safe).
      e2e `e2e/advanced-search.spec.ts`: default two-kind view, deep-link filters reflected in the form,
      types narrowing, keyword-submit banner. Deviation: the TMDB search endpoints silently ignore
      genre/rating/sort params (verified live on 2026-10-22), so keyword results are relevance-ranked
      only — recorded under the capability matrix.
- [ ] Per-type pagination / load-more (partially done via the genre pagination above; search grid still client-paged)
- [x] Watch page (`/movie/[id]/watch`): `FreeFilm` table + seed with verified licenses, Internet Archive player, trailer/providers fallback, CSP `frame-src`
      — M6 (Oct 2026): the watch page follows §5 verbatim — PPR page (DetailSkeleton shell) with three honest
      states: curated film with a verified IA item (a "Full film — {license}" pill, the `archive.org/embed/`
      player in `components/free-film-player.tsx`, sandboxed with allow-fullscreen, plus a `<noscript>` direct
      file/item link), a seeded-but-currently-unverified copy (amber banner + the item page link + fallback
      below), and no free stream (honest banner + trailer + Where-to-watch reuse). License/attribution block:
      IA custody + item link + "distributed copy runs {runtime}", the license reference URL, the full
      verification note, and the per-country caveat. Curation is auditable: 7 titles (A Trip to the Moon,
      Nosferatu, Night of the Living Dead, Carnival of Souls, Detour, D.O.A., Big Buck Bunny), each with its
      TMDB id matched live, its IA identifier verified live via the metadata API (responses recorded as
      `test/fixtures/archive-metadata-*.json` feeding the unit tests), and a license basis — the Wikipedia US
      PD list (pre-1931 rule / missing notice / non-renewal) or the item's own CC licenseurl — all dated
      2026-10-22 in `prisma/seed.ts` notes. A Charade candidate was dropped: the only IA item found was a
      3-minute trailer. `lib/api/internet-archive.ts` is the Zod client (IA numbers arrive as plain numbers,
      numeric strings, or "67:38" clock strings; per-field catch keeps one bad derivative from failing the
      item; split-part detection can't use `\b` because IA names like `…-1of5_512kb.mp4` run digits into
      underscores — the bug class the unit tests pin). `lib/free-film.ts` resolves the live DB row +
      hourly-cached IA verification (`cacheTag "archive:{id}"`); it awaits `connection()` because the pg SCRAM
      handshake's `crypto.getRandomValues()` is an unstable prerender value (cacheComponents strictness).
      `prisma/seed.ts` (tsx) persists the 7 rows; seeding wires through `prisma7.config.ts` `migrations.seed`
      (Prisma 7 no longer reads package.json `prisma.seed`). Detail pages get the §5 CTA ("Watch" for free
      films, "Trailer & where to watch" otherwise; series pages get neither). CSP: `frame-src` restricted to
      youtube-nocookie + archive.org site-wide (`next.config.ts` headers); the trailer iframe gained the same
      sandbox/allow security line (verified live that YouTube playback still streams captions). Footer gained
      the IA credit and lost its now-stale "links arrive in a later phase" disclaimer. e2e
      `e2e/watch-free.spec.ts` (5 tests): free CTA, embed + license + audit markers, non-free fallback,
      non-free CTA label, series exclusion (`/tv/[id]/watch` is a real 404). Gates: tsc + lint clean, Vitest
      71/71 (11 new), build green, Playwright 20/20, prod HTTP checks green (CSP header everywhere, embed +
      noscript + license markers, honest fallback text, streamed NEXT_HTTP_ERROR_FALLBACK;404 + noindex for
      missing/non-numeric ids — the semantics detail pages have had all along). Deviations/nuances: D.O.A.'s
      film year follows TMDB (1949-12-23) while the IA item's own noisy date field says 1955 — recorded in
      the seed note; split items report the sum of their parts as "distributed copy runs" (Nosferatu's five
      ~19-minute parts → 1h 36m); seed changes only reflect after a dev restart if the IA cache entry would
      otherwise hold (cacheTag invalidation covers production).

### Phase 5: Polish & Deploy (Week 3)
- [x] Dark mode toggle — M7 decision (Oct 2026): skipped by design, not by omission. The visual identity is deliberately cinema-dark (the palette IS the brand); a light theme would be a redesign, not a toggle. Revisit only if a genuinely wanted light identity is designed.
- [x] Loading states & skeletons — M7 audit (Oct 2026): every data surface already renders an instant shell with an honest loading shape — detail pages + watch page (DetailSkeleton), genre shelves (PosterGridSkeleton), advanced search (AdvancedSkeleton), profile (ProfileSkeleton), basic search (client pending/error states). Route-level loading.tsx files were deliberately NOT added: partial prefetching + PPR shells make them redundant here, and a top-level spinner could contradict a page's own streamed skeleton.
- [x] Error boundaries & toast notifications — M7 (Oct 2026): `components/data-error.tsx` is the shared client segment-boundary UI (heading, honest hint, Try again, Back to Discover) wired as error.tsx for the root safety net + movie (+ its /watch child), tv, genres, search (covers basic + advanced) segments, and app/global-error.tsx as the shell-level last resort. Verified live, not by fixture: with the DB stopped, /movie/10331 (its FreeFilm read is the request-time Prisma call) rendered "This film can't load right now" inside the intact layout, and the prod log shows the real ECONNREFUSED passing through it; /movie/10331/watch hit the same boundary. `components/toast.tsx` is a minimal accessible failure toaster (aria-live region always mounted, stack capped at 3, auto-dismiss, dismiss buttons) hosted in providers; FavoriteButton failures — previously an sr-only alert invisible to sighted users — now toast ("didn't update just now — the server didn't respond") while the optimistic rollback returns the heart; verified end-to-end by intercepting the favorites POST: toast renders and the toggle rolls back. Profile removals keep their inline visible error (in-place beats a toast there). Gates: tsc + lint clean, Vitest 78/78 (7 new seo tests), build green, Playwright 20/20.
- [x] SEO metadata (detail + genre pages) — M7 (Oct 2026): `lib/seo.ts` holds the pure builders (unit-tested): detailSeo (real overview as description — no fabricated blurbs; a title+year line when the source omits one; og:type video.movie / video.tv_show; og:title/description/siteName; twitter summary_large_image with the wide backdrop preferred, poster fallback, card degrading to "summary" without artwork) and genreSeo ("{Label} movies & series" through the root title template + an honest browse description; og type website). Titles keep the "%s — Movie Lake" template (detail bare title, watch "Watch {title}"). Social images are the listings' absolute TMDB CDN URLs — no metadataBase involved (relative URL-based metadata without one is a build error per the bundled metadata reference). Verified in prod HTML: og:title/og:type/og:image/og:site_name/twitter:card on both detail kinds, full genre tag set. Search pages already shipped noindex in M5.
- [x] Playwright E2E: login → favorite → profile (`e2e/auth.spec.ts` shipped in M2; runs with the local Postgres up)
- [x] Vercel deployment config — deployed Oct 2026 from GitHub (`Virtual-forge/movie-lake`, git-integrated auto-deploys). Build hardening: `pnpm-workspace.yaml` allowBuilds covers prisma + esbuild (CI fails installs on unapproved build scripts — first deploy learned this), build script = `prisma generate && next build`, env contract in `.env.example` + README (TMDB_API_READ_TOKEN, Neon pooled DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL production URL; previews use `https://${VERCEL_URL}`).
- [x] Neon Postgres with pooled connection string — Neon project created; operator ran `prisma migrate deploy` (both migrations) and `prisma db seed` (7 curated FreeFilm rows, license records verified from their sources) against the pooled URL from a local terminal. Post-seed prod verification: free-film detail gets the Watch CTA, its watch page serves the real `archive.org/embed` player + license block, non-free films disclose nothing beyond trailers/retail, and the M8 `sourceUnavailable` degrade no longer triggers anywhere.
- [ ] Caching tuning — optional and deferred: default Vercel caching already works with `cacheComponents` (+ hourly TMDB/IA `use cache` lifetimes are doing their job). The remaining scale-upgrades are the `use cache: remote` cache handler swap and an Upstash-backed replacement for the M5 per-instance in-memory rate limiter — only worth it once there is traffic or >1 build/runtime instance.

**If the schedule slips, cut in this order:** year/rating sliders on advanced search (done as paired inputs in M5; a slider fork would compete) → dark mode (see the M7 decision above — skipped as a design call) → genre sub-filters on genre pages.

**M8 fix round (Oct 2026, live bug reports from the deployed build):**
- Movies/Series landing was a dead end: an empty query rendered a "type to search" card plus a forever-pending skeleton grid below it. Browse mode instead: `/api/search` now serves the discovery feed for short/empty queries (popularity sort — the advanced page's `DEFAULT_SORT` — with the same `vote_count.gte=10` quality floor, adult excluded, TMDB page cap), and the search client runs its queries without a query too, presenting the surface as "Browse films & series" with honest loading/empty/error copy.
- Kind switching desynced the URL: the header's Movies/Series links re-rendered the server page while the client kept the first kind it ever saw (React preserves component state without a remount), and the in-page tabs were state-buttons fighting the URL. Tabs are now URL-param links (the genre-page pattern: `Link` + `aria-current`, query preserved in the href) and `SearchResults` keys `SearchClient` on `q|kind` so every server navigation resets client state to the URL. e2e: browse-without-typing plus header-link URL sync in `e2e/smoke.spec.ts` (the hydration-race lesson — wait for client-fetched cards before clicking header links — lives in the test comments).
- Detail pages died on a database hiccup: `resolveFreeFilm`'s request-time Prisma read threw straight into the M7 error boundary (verified live before the fix). It now returns a tri-state — curated / not-curated / `sourceUnavailable`: detail pages hide the watch CTA and claim nothing; the watch page explains the catalog could not be checked (amber banner, "may still be playable in full", trailer + retail options below — same shape as the seeded-but-unverified state).
- Mobile: the primary nav was `lg:flex`-only, leaving phones with zero page buttons — a disclosure menu in the same pill language fixes it (Menu/X toggle, `aria-expanded`/`aria-controls`, closes on link tap; e2e covers open → navigate → closed). Footer/body: `min-h-full` → `min-h-dvh` (html has no height, so percentage min-height could not guarantee bottom anchoring on short pages) and modest mobile compaction (`mt-10 pt-8 pb-10`, md keeps the old rhythm). The "endless empty space" on mobile search was the skeleton void above the footer — meaured: footer bottom == scrollHeight, gapBelowFooter 0 even while the void existed.
- Gates: tsc + lint clean, Vitest 78/78, build green, Playwright 23/23 (3 new). Deploy rides the Vercel git integration; the database steps remain the operator's (`prisma migrate deploy` + `prisma db seed` against the Neon string — without tables every detail page honestly reports `sourceUnavailable`).

**M9 tuning + feel round (Oct 2026):**
- Caching tuning, resolved against the bundled Next 16.4 docs rather than the old plan note: the "remote cacheHandlers" idea was a self-hosting lever — `cacheHandlers` configures `'use cache'` backends for **multi-instance coordination** ("Without shared cache, each instance maintains its own cache independently — revalidation events don't propagate across instances", `deploying-to-platforms.md`). Vercel is the reference platform: PPR shells, `use cache` entries (hourly TMDB rails, daily genres) and ISR revalidation already run on its platform data cache with nothing to configure — idea retired with the docs cited.
- The one real cross-instance gap is rate limiting: `lib/rate-limit.ts` was in-memory per process, so on serverless every instance owned its own "30/min" window. Now one interface over two honest backends — when `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` exist, an Upstash **shared sliding window** (`Ratelimit.slidingWindow`, instances cached per window shape); otherwise the unchanged in-memory fixed window keeps dev/preview working. `rateLimit` went async (favorites callers `await` it). The Upstash path **fails open** (logged) — a limiter outage must not take the API down. Activation is purely env vars (`.env.example` + README deploy section updated; same values on every Vercel environment so previews share one window). In-memory fallback contract pinned in `test/rate-limit.test.ts` (burst cap + window restart).
- Carousels draggable by mouse: `components/use-drag-scroll.ts` (pointer gestures for mouse/pen only — touch already pans natively; 4px threshold keeps clicks; scroll-snap disabled inline for the gesture, restored after settle; time-consistent momentum glide with velocity clamp and a tab-stall rAF guard, skipped under reduced motion). Two lessons now encoded in the hook: `setPointerCapture` must be claimed at the drag threshold, **not** on pointerdown — capture retargets the follow-up click to the `<ul>`, which killed every card link (broke the previously-green homepage e2e until found); and native image drag hijacks the gesture (`pointercancel` one move in) — the scroller cancels `dragstart`. Server rails (cast, seasons, genre chips) share it through the tiny client `DragScroller`; poster-rail wires the hook directly (it already kept a ref).
- Cards slide in on load: pure-CSS `card-in` keyframes in `app/globals.css` (420ms, from-right 28px, `backwards` fill) with `entryIndex` stair (35ms/card, capped 385) passed from the rails/search/genre grids — CSS animates streamed content on arrival and replays on navigations without JS, re-renders don't replay it. Fully gated: the keyframes live inside `prefers-reduced-motion: no-preference` (verified `animationName: none` under emulation) on top of the existing global reduced-motion kill-switch.
- Gates: tsc + lint clean, Vitest 80/80 (2 new), build green, Playwright 24/24 (1 new: real CDP mouse drag + scroll assertion + swallow-click no-navigation). Debug lessons: cards near the page bottom measure outside the 720px viewport — `elementFromPoint` is null there, use `scrollIntoViewIfNeeded` then an in-viewport y; the swallowed click is asserted via `el.click()` — a locator click would start a fresh press and clear suppression first.

**M10 mobile navigation round (Oct 2026, live feedback):**
- Footer void on mobile (user screenshot): could not be reproduced — every page measured footer bottom == scrollHeight (home, search browse, advanced, detail, watch incl. the archive page, genre, auth) in a phone-sized viewport; no DOM element extends past the footer anywhere. Treat it as browser-level reveal of the body background (rubber-band past page end / dynamic-viewport states on Android), hardened with `overscroll-behavior-y: contain` on `html` (kills the past-end background reveal and pull-to-refresh — neither is designed for this app). If it reappears on a device, capture the exact page + scroll state.
- Mobile menu rebuilt as a slide-in drawer (right, `min(82vw,340px)`, backdrop): CSS-owned transitions in globals.css (`drawer-panel`/`drawer-backdrop` + `data-open`), always-mounted panel (closed = `visibility:hidden` + off-screen transform) so open AND close animate; closes on link tap, backdrop tap, Escape, and any post-open navigation (activeHref effect). Focus lands on the first link, body scroll locks while open, trigger refocuses on Escape. **Draggable closed**: pointer handlers on the panel follow the finger rightward (claim past 8px, computed transform, snap decision at 110px or a >0.45px/ms flick; snaps back otherwise) with the M9 lessons applied — capture claimed only at the threshold, and `dragstart` cancelled on the panel (links start a native drag that would pointercancel the gesture midway).
- Desktop nav indicator: single sliding bar replaces the per-item inline underline (which only ever highlighted Discover). `activeHref` resolver ( Discover | Movies | Series | Advanced, null on detail/genre/auth pages and on bare `/search` = "All") streams through the existing Suspense pattern (`SiteHeader` reads pathname + searchParams; `HeaderBody` stays URL-hook-free per the prerender constraint). The bar measures its item's label span (query `span`, **not** `firstElementChild` — Discover's flame icon would give a 14px bar), mounts in place (null→value never animates a false start), and glides `left/width` 200ms ease-out on every page change; re-measures on resize.
- e2e additions: drawer closes via real CDP drag (rightward 225px, aria-expanded flips, visibility hidden), drawer hugs the right edge (x + width == viewport width — chi fixtures lie; the MCP emulation anchors `fixed` to the real 1560px window), indicator physically relocates Discover→Series (>80px). Existing M8 mobile-menu test passes unchanged against the drawer.
- Gates: tsc + lint clean, Vitest 80/80, build green, Playwright 26/26 (2 new, 1 extended).

---

## ✅ Technical Decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | Listing types | Movies + TV + Books (TMDB + Google Books). Open Library deferred. |
| 2 | Auth | Better Auth: email/password + Google. GitHub deferred. |
| 3 | Database | PostgreSQL from day one (Docker locally, Neon in production). |
| 4 | Search behavior | Hybrid: server-rendered initial load, client refinement with TanStack Query. |
| 5 | Styling | shadcn/ui + Tailwind. |
| 6 | Favorites | Backend-synced (Prisma + Postgres). |
| 7 | Pagination | Per-type, independent (no merged infinite scroll). |
| 8 | Genres | Curated canonical taxonomy in `lib/genres.ts`. |
| 9 | Watching | Movie watch page: full playback for curated public-domain/open-license films (Internet Archive); trailer + region-aware where-to-watch for everything else. No unlicensed streams. |

---

## 📋 Next Steps

1. Create API keys: TMDB (Bearer token), Google Books, Google OAuth client.
2. Start Phase 1.
3. Verify Better Auth + Prisma setup against current docs before writing auth code.

---

## 💡 Future Enhancements (Post-MVP)
- Self-hosted/licensed playback (HLS) behind the same `Player` component
- Episode playback for free TV titles
- Open Library fallback for book data/covers
- GitHub OAuth
- Saved searches
- Watchlist / "Plan to Watch" and History tabs
- Recommendations based on favorites
- Social features (share lists, follow users)
- Reviews & ratings
- Export/import favorites (JSON/CSV)
- PWA support
- Email notifications for new releases in favorite genres

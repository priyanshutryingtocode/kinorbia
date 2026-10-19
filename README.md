# Kinorbia

A movie and TV tracking app: discover titles, rate and review them, build lists, and keep
a watch history. Next.js App Router, TypeScript, Tailwind CSS v4, MongoDB via Mongoose,
NextAuth.

Demo accounts (password `demo1234` for all — sign in with email + password):

- `demo1@kinorbia.dev` — Ava Moreno
- `demo2@kinorbia.dev` — Leo Kim
- `demo3@kinorbia.dev` — Maya Patel

## Features

- **Trending** — the landing page. What everyone is watching this week, filterable by
  movie/show and by TMDB's day/week window, loaded 20 at a time. It is the one page that
  renders identically for a signed-out visitor, because nothing on it reads your library.
- **Discover** — TMDB search, browse and genre discovery at `/movies` and `/shows`, plus
  per-title recommendations. Genre browsing is linkable (`/movies?genre=28`), so any genre
  view can be shared, bookmarked or prefetched.
- **Track** — favorites, a watchlist, and a watch history, each first-write-wins by date.
- **Library facets** — the profile shelf narrows by genre, minimum personal rating and
  release year, and sorts by recency, rating, title or year. Paging a narrowed shelf keeps the
  narrowing.
- **For you** — taste-based recommendations built from what you have actually watched: genres
  weighted by how often you watch them, then tilted by the ratings you gave, so a genre you
  keep rating poorly is down-weighted. Explains itself rather than being a black box, and
  stays empty until there is enough history to be worth guessing from.
- **Where to watch** — streaming, rent and buy services on every title page, grouped by kind.
- **Rate and review** — rating is 1–10 (shown as 0.5–5 stars) and requires the title be
  marked watched first. A review requires a rated favorite, resolved server-side from the
  submitted key rather than trusted form fields.
- **Lists** — public or private curated lists with an ordering that survives edits.
- **Social** — follow members, like and comment, with a notification feed.
- **Friends activity** — one feed of reviews, lists and watches from the members you follow, paged by an opaque cursor. Sharing what you watch is opt-in, and reaches only your followers: never the public Community feed.
- **Read APIs** — the browser reads through server components, so most of the app's reads had
  no HTTP path at all. `GET /api/user/media`, `/api/user/feed`, `/api/user/me`,
  `/api/user/recommendations` and `/api/movie/search` expose the same domain functions over
  HTTP as thin transport wrappers — no duplicated logic, no bypassed validation.
- **Assistant** — a Gemini-backed chat that answers from the signed-in member's own
  favorites and watch history.
- **Auth** — email + password or Google, with email verification and password reset.
- **Export** — everything a member has written or saved, as one downloadable JSON file.
- **Observability** — structured JSON logging with automatic redaction of emails, secret
  keys and URL query secrets.

## Getting started

Requires Node 18+ and a MongoDB database (Atlas or local).

```bash
npm install
```

Create `.env.local`:

```env
MONGODB_URI=your_mongodb_connection_string
AUTH_SECRET=your_auth_secret
TMDB_API_KEY=your_tmdb_api_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`TMDB_IMAGE_URL` is optional and defaults to `https://image.tmdb.org`. Set it to move the poster,
backdrop, cast and provider-logo images to another CDN. A bare host is the intended value; a value
carrying a size segment (the older `https://image.tmdb.org/t/p/original`) is still accepted and
normalised, so an existing deployment is unaffected. Anything unparseable falls back to the default
rather than breaking every image — and because it is read on the server, set it in Vercel's project
environment as well as `.env.local`, which is not read in production.

Optional features each need one more key:

```env
GOOGLE_CLIENT_ID=...            # Google sign-in
GOOGLE_CLIENT_SECRET=...
RESEND_API_KEY=...              # email verification + password reset
EMAIL_FROM=KinOrbia <onboarding@resend.dev>
UPSTASH_REDIS_REST_URL=...      # rate limiting
UPSTASH_REDIS_REST_TOKEN=...
GEMINI_API_KEY=...              # the assistant
GEMINI_MODEL=gemini-2.5-flash
```

Then:

```bash
npm run dev
```

Seed data is available via `npm run seed:data` (add `--dry-run` to preview).

## Project structure

| Path | Contents |
| --- | --- |
| `/app` | Pages, layouts and API routes. No database access and no models — routes parse, delegate and map HTTP. |
| `/features` | One folder per domain, holding whichever of `queries.ts` (reads), `mutations.ts` (writes), `actions.ts` (server actions) and `serializers.ts` that domain needs. |
| `/lib` | Shared utilities, the TMDB client, auth config and `dbConnect.ts`. `tasteProfile.ts` holds the recommendation scorer as pure functions — no database, no network — so the interesting part can be checked by hand. |
| `/models` | Mongoose schemas. |
| `/components` | Reusable React components. |
| `/scripts` | Gates and one-shot maintenance tools (see below). |

## Data model

One `usermovies` document per `(userEmail, movieId, mediaType)` holds all three states a
member can hold towards a title:

```js
{ userEmail, movieId, mediaType, /* TMDB snapshot */,
  favorite: { addedAt, personalRating },
  watchlist: { addedAt },
  watched:  { watchedAt } }
```

A unique index on those three fields makes duplicates impossible. `User.favorites`,
`User.watchlist` and the `journalentries` collection were dropped in favour of this;
`favoritesCount`/`watchlistCount` on the member are what the caps are enforced against.

## Gates

Run before committing. All are read-only except where noted.

| Command | Checks |
| --- | --- |
| `npm run check:mutations` | 27 invariants against live Atlas, each in a transaction that is aborted. 0 rows persist. |
| `npm run check:retry` | TMDB fetches retry transport failures, and search pages fill to a row-multiple of their grid. |
| `npm run check:unused` | Exports nothing else reads. |
| `npm run check:contrast` | Every colour pair meets its WCAG ratio. |
| `npm run check:indexes` | Declared indexes match the server. `--strict` exits 1 on unexplained drift. |
| `npm run check:media-counts` | The favorite/watchlist counters match the rows. `--strict` gates; `--fix` reconciles. |
| `npm run check:db` | Referential integrity and schema conformance: orphaned rows, missing titles, rows over cap, collections with no model, broadcast rows without consent. `--strict` exits 1 on any error. |
| `npm run check:feed` | The activity feed's cursor: every visible row served exactly once, no repeats, no ordering breaks, nothing the visibility filter excludes. |
| `npm run check:privacy` | No member's data export carries another member's email address. Runs `--strict`, so a leak exits 1. |
| `npm run check:export` | Every field a member owns is actually in their export: exact key sets per section, no secrets, section counts matching the database, and nothing but JSON-native values. |
| `npm run check:class-names` | No class name is built by interpolation. Tailwind only sees literal strings, so an interpolated class is never generated as CSS — it renders in the wrong place, with the build still green. |
| `npm run check:serialization` | No raw ObjectId or `Date` crosses into a client payload from the feed, comment threads or profile pages. |
| `npm run lint` | ESLint, zero warnings tolerated. |

`watched.broadcast` is stamped at write time from the member's `shareActivity` flag, so the
feed never looks up a follower's preference; turning the flag off clears the stamp with one
`updateMany`. `check:db` asserts no broadcast row survives for a member whose flag is off.

The counters, indexes and cursor all drift silently if a write path bypasses the
transactional helpers, which is why the `check:*` scripts exist rather than a general
test suite.

## Maintenance scripts

One-shot, run deliberately. The `drop:*` scripts are destructive.

| Command | Effect |
| --- | --- |
| `npm run backfill:user-movie` | Populate `usermovies` from the legacy embedded arrays. |
| `npm run backfill:title` | Fill missing `title` on existing rows. |
| `npm run backfill:null-titles` | Re-fetch `usermovies.title` from TMDB where it is null. Dry run unless `-- --yes`. |
| `npm run drop:media` | Drop `User.favorites` / `User.watchlist`. |
| `npm run drop:journal` | Drop the `journalentries` collection. |
| `npm run check:watched-parity` | Verify watched parity during the migration. |
| `npm run reset:db` | Wipe and reseed. |

### Deleting a Mongoose model

Mongoose's `autoIndex` **creates a collection**. Deleting a model's source file is not
enough — a stale `.next` cache still references it, and the next build recompiles the
model and silently recreates its collection against the live database.

After deleting a model: `rm -rf .next` and rebuild. Verify with `npm run check:indexes`,
which reports indexes the schema no longer declares.
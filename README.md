# Kinorbia

A movie and TV tracking app: discover titles, rate and review them, build lists, and keep
a watch history. Next.js App Router, TypeScript, Tailwind CSS v4, MongoDB via Mongoose,
NextAuth.

Demo accounts (password `demo1234` for all — sign in with email + password):

- `demo1@kinorbia.dev` — Ava Moreno
- `demo2@kinorbia.dev` — Leo Kim
- `demo3@kinorbia.dev` — Maya Patel

## Features

- **Discover** — TMDB search, browse and genre discovery for movies and shows, plus
  per-title recommendations.
- **Track** — favorites, a watchlist, and a watch history, each first-write-wins by date.
- **Rate and review** — rating is 1–10 (shown as 0.5–5 stars) and requires the title be
  marked watched first. A review requires a rated favorite, resolved server-side from the
  submitted key rather than trusted form fields.
- **Lists** — public or private curated lists with an ordering that survives edits.
- **Social** — follow members, like and comment, with a notification feed.
- **Assistant** — a Gemini-backed chat that answers from the signed-in member's own
  favorites and watch history.
- **Auth** — email + password or Google, with email verification and password reset.
- **Export** — everything a member has written or saved, as one downloadable JSON file.

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
| `/lib` | Shared utilities, the TMDB client, auth config and `dbConnect.ts`. |
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
| `npm run check:db` | Referential integrity and schema conformance: orphaned rows, missing titles, rows over cap, collections with no model. `--strict` exits 1 on any error. |
| `npm run lint` | ESLint, zero warnings tolerated. |

The counters and indexes drift silently if a write path bypasses the transactional
helpers, which is why `check:media-counts`, `check:indexes` and `check:db` exist rather
than a general test suite.

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
# Kinorbia

A movie and TV tracking app: discover titles, rate and review them, build lists, and keep
a watch history. Built with Next.js App Router, TypeScript, Tailwind CSS v4, MongoDB via
Mongoose, and NextAuth.

Demo accounts (password `demo1234` for all — sign in with email + password):

- `demo1@kinorbia.dev` — Ava Moreno
- `demo2@kinorbia.dev` — Leo Kim
- `demo3@kinorbia.dev` — Maya Patel

## Features

- **Trending** — the landing page; what everyone is watching this week.
- **Discover** — TMDB search, browse and genre discovery, plus per-title recommendations.
- **Track** — favorites, a watchlist, and a watch history.
- **Rate and review** — 1–10 ratings (requires the title to be marked watched first) and
  reviews on rated favorites.
- **For you** — taste-based recommendations built from your watch history and ratings.
- **Lists** — public or private curated lists with stable ordering.
- **Social** — follow members, like and comment, with an activity feed and notifications.
- **Assistant** — a Gemini-backed chat that answers from your own library.
- **Auth** — email + password or Google, with email verification and password reset.
- **Export** — everything you've written or saved as one downloadable JSON file.

## Architecture

Layered, with domain logic kept out of the HTTP and UI layers:

| Path | Contents |
| --- | --- |
| `app/` | Pages, layouts and API routes. No database access — routes parse, delegate, and map HTTP. |
| `features/<domain>/` | One folder per domain (`media`, `reviews`, `lists`, `social`, …), holding `queries.ts` (reads), `mutations.ts` (writes), `actions.ts` (server actions) and `serializers.ts` as needed. |
| `lib/` | Shared utilities, the TMDB client, auth config, `dbConnect.ts`. Pure logic (e.g. the recommendation scorer in `tasteProfile.ts`) lives here with no database or network dependency. |
| `models/` | Mongoose schemas. Title state (favorite / watchlist / watched) lives in one `usermovies` document per `(userEmail, movieId, mediaType)`, enforced by a unique index. |
| `components/` | Reusable React components. |

Most reads happen in server components via the feature layer, so the app needed few HTTP
reads at all; the few routes under `app/api/` are thin wrappers over the same domain
functions, with no duplicated logic. Writes go through server actions and feature
mutations.

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
```

Then:

```bash
npm run dev
```

Seed data is available via `npm run seed:data` (add `--dry-run` to preview).

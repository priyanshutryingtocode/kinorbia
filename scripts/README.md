# Admin scripts

One-off maintenance jobs, run manually against a database URI. They are plain
`.mjs` and talk to MongoDB directly rather than going through the app, so they
can run without booting Next.js.

## Running them

They need a URI in the environment — `MONGO_MONGODB_URI` or `MONGO_URI`:

```bash
MONGO_MONGODB_URI="mongodb+srv://..." node scripts/seedData.mjs
```

## The `mongodb` driver is a devDependency

`mongodb` and `bcryptjs` are in `devDependencies`, not `dependencies`. That is
deliberate — they are only needed to run these scripts, and a normal production
install (`npm ci --omit=dev`) does not need a MongoDB driver at runtime, since
the app itself goes through Mongoose.

The consequence: **a production-only install cannot run these scripts** and will
fail with `Cannot find package 'mongodb'`. Install it first:

```bash
npm i -D mongodb
```

Locally this is a non-issue, because a normal `npm install` includes
devDependencies.

## The two check scripts are not admin scripts

The other three need a live database. This one reads `app/globals.css` and the
component tree and needs neither a URI nor any dependency, so it takes no
`--env-file`:

```bash
npm run check:contrast
npm run check:unused
```

It exists because of a specific failure. `text-neutral-700` is a Tailwind grey
intended for a light background, and it reached fifteen call sites in an app
whose canvas is `#0a0a0a`. At 1.91:1 it rendered the rating stars, the disabled
pager buttons, and every poster-fallback icon invisible — none of which is
obvious in review. The script rejects those greys outright, checks every
declared `--color-*` against all three surfaces of both themes, verifies each
one actually resolves, and checks the two raw-palette filled chips that also
carry accent text. `checkUnusedExports.mjs` covers a gap the other three cannot: `tsc --noUnusedLocals` and
`eslint` both pass with an unused export, because an export is by definition "used" as far as the
compiler is concerned. Ten had accumulated, five of them added by the refactors that introduced them —
including `DIALOG_PANEL_CLASS`, exported from `AccessibleDialog` under a comment saying
`TrailerButton` named the same default, which it never did. It found two more on its first run, and
then found its own blind spot: `auth.ts` sits at the repo root rather than under a directory, so a scan
of `app`, `components`, and `lib` alone reported its only two consumers as unused.

Worth running in CI alongside `tsc`, `eslint`, and `build`.

## What each one does

| Script | Purpose | Destructive |
|---|---|---|
| `seedData.mjs` | Seeds demo users, media and social data. | Yes — deletes existing data for the demo accounts first. |
| `resetDb.mjs` | Empties every collection and recreates the indexes. | Yes — `deleteMany({})` on each collection. |
| `backfillVerified.mjs` | Backfills `emailVerified` on accounts that predate the field. | Partly — it also removes duplicate `journalentries` rows so the compound unique index can be built. |

`seedData.mjs` and `resetDb.mjs` delete data. `backfillVerified.mjs` deletes
duplicate watched-rows. Read any of them before pointing it at something you
care about.

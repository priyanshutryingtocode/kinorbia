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

## What each one does

| Script | Purpose | Destructive |
|---|---|---|
| `seedData.mjs` | Seeds demo users, media and social data. | Yes — deletes existing data for the demo accounts first. |
| `resetDb.mjs` | Empties every collection and recreates the indexes. | Yes — `deleteMany({})` on each collection. |
| `backfillVerified.mjs` | Backfills `emailVerified` on accounts that predate the field. | Partly — it also removes duplicate `journalentries` rows so the compound unique index can be built. |

`seedData.mjs` and `resetDb.mjs` delete data. `backfillVerified.mjs` deletes
duplicate watched-rows. Read any of them before pointing it at something you
care about.

// Fill `reviews.title` where it is missing or empty.
//
// Every seeded review was written with the key `movieTitle` instead of `title`, and the
// schema takes `title` from mediaCoreFields -- so the wrong key was dropped on insert and
// all 150 documents landed with no title at all. `title` is `required`, which normally makes
// that impossible, but a required field is only enforced by a validating write and seeding is
// not one. The reviews still read fine as rows; they just render blank, and `alt={title}`
// became `alt={undefined}`, which makes next/image omit the attribute and warn per image.
//
// This does NOT call TMDB. Unlike `backfill:null-titles`, which has to re-fetch titles the
// id can resolve, every affected review already carries the right value under `movieTitle` --
// so this is a local field copy, and it cannot be rate-limited or fail on the network:
//
//   1. `movieTitle`, when it is a non-empty string. This is the seeded value.
//   2. usermovies, by (movieId, mediaType). For a review whose legacy key is also missing.
//   3. Nothing. Reported and skipped -- a wrong title is worse than a blank one to fix later.
//
// Safe by default: reports and changes nothing without --yes. The stale `movieTitle` is left
// in place rather than unset, so the repair is reversible and `buildSocial`'s
// `doc.movieTitle || doc.title` keeps working either way.
//
//   npm run backfill:review-titles -- --dry    report only
//   npm run backfill:review-titles -- --yes    write

import { MongoClient } from "mongodb";

const YES = process.argv.includes("--yes");
const URI = process.env.MONGO_MONGODB_URI || process.env.MONGODB_URI;
const DB_NAME = process.env.MONGO_DB_NAME || "test";

if (!URI) {
  console.error("MONGODB_URI or MONGO_MONGODB_URI must be set in .env.local");
  process.exit(1);
}

const BLANK = { $or: [{ title: { $exists: false } }, { title: null }, { title: "" }, { title: { $regex: /^\s+$/ } }] };

const client = new MongoClient(URI);

try {
  await client.connect();
  const db = client.db(DB_NAME);
  const reviews = db.collection("reviews");
  const movies = db.collection("usermovies");

  const broken = await reviews.find(BLANK).toArray();
  console.log(`reviews with a missing or empty title: ${broken.length}`);

  if (broken.length === 0) {
    console.log("\nnothing to repair.");
    process.exit(0);
  }

  // usermovies is the fallback source only. Built lazily and only for the rows that need it,
  // so a clean run never loads 669 documents to repair none of them.
  let library = null;
  async function libraryTitles() {
    if (library) return library;
    library = new Map();
    for (const row of await movies.find({}, { projection: { movieId: 1, mediaType: 1, title: 1 } }).toArray()) {
      if (row.title) library.set(`${row.mediaType}:${row.movieId}`, row.title);
    }
    return library;
  }

  const seeded = [];
  const borrowed = [];
  const unresolved = [];
  // Declared before the fallback block, which pushes into it.
  const fromLibrary = [];

  for (const row of broken) {
    const legacy = row.movieTitle;
    if (typeof legacy === "string" && legacy.trim()) {
      seeded.push({ id: row._id, title: legacy, source: "movieTitle" });
      continue;
    }
    borrowed.push({ id: row._id, title: "", source: "usermovies", key: `${row.mediaType}:${row.movieId}` });
  }

  if (borrowed.length > 0) {
    const byKey = await libraryTitles();
    for (const entry of borrowed) {
      const found = byKey.get(entry.key);
      if (found) {
        entry.title = found;
        fromLibrary.push(entry);
      } else {
        unresolved.push(entry);
      }
    }
  }

  const resolved = [...seeded, ...fromLibrary];

  console.log(`\n  repaired from movieTitle: ${seeded.length}`);
  console.log(`  repaired from usermovies: ${fromLibrary.length}`);
  console.log(`  unresolved:              ${unresolved.length}`);

  if (unresolved.length > 0) {
    console.log("\nThese have no title under either key and were left untouched:");
    for (const entry of unresolved.slice(0, 10)) {
      console.log(`  ${entry.id}  (${entry.key})`);
    }
    if (unresolved.length > 10) console.log(`  ... and ${unresolved.length - 10} more`);
  }

  const sample = resolved.slice(0, 5);
  if (sample.length > 0) {
    console.log("\nsample of what would be written:");
    for (const entry of sample) {
      console.log(`  ${entry.id}  ${JSON.stringify(entry.title)}  <- ${entry.source}`);
    }
  }

  if (!YES) {
    console.log("\nDry run. Nothing written. Re-run with --yes to apply.");
    process.exit(0);
  }

  if (resolved.length === 0) {
    console.log("\nnothing writable; exiting.");
    process.exit(0);
  }

  // bulkWrite so the whole repair is one round trip rather than 150 sequential updates.
  const result = await reviews.bulkWrite(
    resolved.map((entry) => ({
      updateOne: {
        filter: { _id: entry.id },
        update: { $set: { title: entry.title } },
      },
    })),
    { ordered: false }
  );

  console.log(`\nmodified ${result.modifiedCount} of ${resolved.length} reviews.`);

  const after = await reviews.countDocuments(BLANK);
  console.log(`reviews still missing a title: ${after}`);
  if (after > 0) {
    console.error("\nthe repair is incomplete; check:db will still fail.");
    process.exit(1);
  }
  process.exit(0);
} finally {
  await client.close().catch(() => {});
}
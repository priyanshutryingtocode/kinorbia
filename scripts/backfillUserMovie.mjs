// One-shot. Folds favorites, watchlist and journal state into one `usermovies` document
// per (userEmail, movieId, mediaType). Duplicate array rows resolved to the LAST occurrence,
// which is what the old read path did. Idempotent: every write is an upsert and the audit
// re-counts rather than trusting the write count.
//
//   --dry  preview only
//   --yes  write, then audit

import { MongoClient } from "mongodb";

const DRY = process.argv.includes("--dry");
const WRITE = process.argv.includes("--yes");
const URI = process.env.MONGO_MONGODB_URI || process.env.MONGODB_URI;
const DB_NAME = process.env.MONGO_DB_NAME || "test";
const COLLECTION = "usermovies";

if (!URI) {
  throw new Error("MONGO_MONGODB_URI or MONGODB_URI must be set in .env.local");
}

if (DRY === WRITE) {
  console.error("Pass exactly one of --dry (preview) or --yes (write).");
  process.exit(1);
}

const client = new MongoClient(URI);

function describeTarget() {
  const host = new URL(URI.replace("mongodb+srv://", "mongodb://")).hostname;
  return `mongodb://${host}/${DB_NAME}`;
}

async function main() {
  await client.connect();
  const db = client.db(DB_NAME);

  const users = db.collection("users");
  const journal = db.collection("journalentries");
  const target = db.collection(COLLECTION);

  console.log(`Target: ${describeTarget()}`);
  console.log(`Mode:   ${DRY ? "DRY RUN -- nothing will be written" : "WRITE"}`);
  console.log("");

  // --- source inventory ------------------------------------------------------
  const source = await users
    .aggregate([
      {
        $project: {
          email: 1,
          favorites: { $ifNull: ["$favorites", []] },
          watchlist: { $ifNull: ["$watchlist", []] },
        },
      },
      {
        $group: {
          _id: null,
          users: { $sum: 1 },
          favoriteRows: { $sum: { $size: "$favorites" } },
          watchlistRows: { $sum: { $size: "$watchlist" } },
        },
      },
    ])
    .toArray();

  const totals = source[0] || { users: 0, favoriteRows: 0, watchlistRows: 0 };
  const journalRows = await journal.countDocuments({ movieId: { $type: "string" } });

  console.log("Source:");
  console.log(`  users with favorites/watchlist : ${totals.users}`);
  console.log(`  favorite array rows            : ${totals.favoriteRows}`);
  console.log(`  watchlist array rows           : ${totals.watchlistRows}`);
  console.log(`  journal rows keyed by movieId  : ${journalRows}`);
  console.log("");

  // Merged in the database: $group collapses the three sources onto one key and $max
  // picks the latest date, which is what "last write wins" means here.
  const pipeline = [
    {
      $lookup: {
        from: "journalentries",
        // Joined on the lowercased email, as every other path does.
        let: { userEmail: { $toLower: "$email" } },
        pipeline: [
          { $match: { $expr: { $eq: [{ $toLower: "$userEmail" }, "$$userEmail"] } } },
        ],
        as: "journalRows",
      },
    },
    {
      $project: {
        userEmail: { $toLower: "$email" },
        rows: {
          $concatArrays: [
            {
              $map: {
                input: { $ifNull: ["$favorites", []] },
                as: "f",
                in: {
                  movieId: "$$f.movieId",
                  mediaType: { $ifNull: ["$$f.mediaType", "movie"] },
                  title: "$$f.title",
                  posterPath: { $ifNull: ["$$f.posterPath", null] },
                  voteAverage: { $ifNull: ["$$f.voteAverage", 0] },
                  releaseDate: { $ifNull: ["$$f.releaseDate", null] },
                  genreIds: { $ifNull: ["$$f.genreIds", []] },
                  favAddedAt: "$$f.addedAt",
                  personalRating: { $ifNull: ["$$f.personalRating", 0] },
                  wlAddedAt: null,
                  watchedAt: null,
                },
              },
            },
            {
              $map: {
                input: { $ifNull: ["$watchlist", []] },
                as: "w",
                in: {
                  movieId: "$$w.movieId",
                  mediaType: { $ifNull: ["$$w.mediaType", "movie"] },
                  title: "$$w.title",
                  posterPath: { $ifNull: ["$$w.posterPath", null] },
                  voteAverage: { $ifNull: ["$$w.voteAverage", 0] },
                  releaseDate: { $ifNull: ["$$w.releaseDate", null] },
                  genreIds: { $ifNull: ["$$w.genreIds", []] },
                  favAddedAt: null,
                  personalRating: 0,
                  wlAddedAt: "$$w.addedAt",
                  watchedAt: null,
                },
              },
            },
            // Journal rows carry only title + poster, so they supply the watched state.
            {
              $map: {
                input: {
                  $filter: {
                    input: { $ifNull: ["$journalRows", []] },
                    as: "j",
                    cond: { $eq: [{ $type: "$$j.movieId" }, "string"] },
                  },
                },
                as: "j",
                in: {
                  movieId: "$$j.movieId",
                  mediaType: { $ifNull: ["$$j.mediaType", "movie"] },
                  title: "$$j.title",
                  posterPath: { $ifNull: ["$$j.posterPath", null] },
                  voteAverage: 0,
                  releaseDate: null,
                  genreIds: [],
                  favAddedAt: null,
                  personalRating: 0,
                  wlAddedAt: null,
                  watchedAt: "$$j.watchedAt",
                },
              },
            },
          ],
        },
      },
    },
    { $unwind: "$rows" },
    { $match: { "rows.movieId": { $ne: null } } },
    {
      $group: {
        _id: { userEmail: "$userEmail", movieId: "$rows.movieId", mediaType: "$rows.mediaType" },
        // $max is "last write wins" for a date.
        favoriteAddedAt: { $max: { $ifNull: ["$rows.favAddedAt", null] } },
        personalRating: { $max: "$rows.personalRating" },
        watchlistAddedAt: { $max: { $ifNull: ["$rows.wlAddedAt", null] } },
        watchedAt: { $max: { $ifNull: ["$rows.watchedAt", null] } },
        title: { $last: "$rows.title" },
        posterPath: { $last: "$rows.posterPath" },
        voteAverage: { $max: "$rows.voteAverage" },
        releaseDate: { $last: "$rows.releaseDate" },
        genreIds: { $max: "$rows.genreIds" },
      },
    },
    {
      $project: {
        _id: 0,
        userEmail: "$_id.userEmail",
        movieId: "$_id.movieId",
        mediaType: "$_id.mediaType",
        title: 1,
        posterPath: 1,
        voteAverage: 1,
        releaseDate: 1,
        genreIds: 1,
        favorite: {
          addedAt: "$favoriteAddedAt",
          personalRating: "$personalRating",
        },
        watchlist: { addedAt: "$watchlistAddedAt" },
        watched: { watchedAt: "$watchedAt" },
      },
    },
    // An OR across all three states: requiring favorite.addedAt would drop every
    // watchlist-only and watched-only title.
    {
      $match: {
        $or: [
          { "favorite.addedAt": { $ne: null } },
          { "watchlist.addedAt": { $ne: null } },
          { "watched.watchedAt": { $ne: null } },
        ],
      },
    },
  ];

  const merged = await users.aggregate(pipeline).toArray();

  const counts = {
    favorite: merged.filter((m) => m.favorite?.addedAt).length,
    watchlist: merged.filter((m) => m.watchlist?.addedAt).length,
    watched: merged.filter((m) => m.watched?.watchedAt).length,
    both: merged.filter((m) => m.favorite?.addedAt && m.watchlist?.addedAt).length,
    rated: merged.filter((m) => (m.favorite?.personalRating ?? 0) > 0).length,
  };

  console.log("Planned:");
  console.log(`  merged documents to write     : ${merged.length}`);
  console.log(`    favorited                   : ${counts.favorite}`);
  console.log(`    on watchlist                : ${counts.watchlist}`);
  console.log(`    watched                     : ${counts.watched}`);
  console.log(`    favorited AND watchlisted   : ${counts.both}`);
  console.log(`    carrying a rating           : ${counts.rated}`);
  console.log("");

  const existing = await target.countDocuments({});
  console.log(`Existing "${COLLECTION}" rows: ${existing}`);

  if (DRY) {
    console.log("");
    console.log("Dry run. Nothing written. Re-run with --yes to apply.");
    return;
  }

  if (!(WRITE_CONFIRMED)) {
    return;
  }

  // --- write -----------------------------------------------------------------
  const BATCH = 500;
  let written = 0;
  for (let i = 0; i < merged.length; i += BATCH) {
    const batch = merged.slice(i, i + BATCH);
    const ops = batch.map((doc) => ({
      updateOne: {
        filter: {
          userEmail: doc.userEmail,
          movieId: doc.movieId,
          mediaType: doc.mediaType,
        },
        update: { $set: doc },
        upsert: true,
      },
    }));
    const res = await target.bulkWrite(ops, { ordered: false });
    written += res.upsertedCount + res.modifiedCount;
  }

  console.log(`Wrote ${written} document(s).`);

  // The caps are enforced against the member's counters, so they are derived from the
  // collection rather than the per-user loop above.
  //
  // `$type` rather than `$ne: [field, null]`: inside `$sum` the latter is true for a field
  // that is ABSENT, not merely null, so a row with no watchlist sub-document at all is
  // counted as watchlisted. Measured on the live collection that overcounted watchlist by
  // exactly the number of rows missing the field (2), while `countDocuments` on the same
  // rows correctly returned 0. Query FILTERS behave correctly -- only the aggregation
  // expression is wrong, so the filters elsewhere in this file are fine as they are.
  const isDate = (field) => ({ $sum: { $cond: [{ $eq: [{ $type: `$${field}` }, "date"] }, 1, 0] } });

  const perUser = await target.aggregate([
    {
      $group: {
        _id: "$userEmail",
        favoritesCount: isDate("favorite.addedAt"),
        watchlistCount: isDate("watchlist.addedAt"),
      },
    },
  ]).toArray();

  const wanted = new Map(perUser.map((r) => [r._id, r]));
  await users.updateMany({ _id: { $nin: [...wanted.keys()] } }, {
    $set: { favoritesCount: 0, watchlistCount: 0 },
  });
  for (const row of perUser) {
    await users.updateOne(
      { email: row._id },
      { $set: { favoritesCount: row.favoritesCount, watchlistCount: row.watchlistCount } }
    );
  }
  console.log(`Counters set on ${perUser.length} member(s).`);
  console.log("");

  // Re-derived from the target, not from what the write reported. $type for the same
    // reason as the counters above: no $project runs before this $group, so a missing
    // field is missing, and $ne: [field, null] would count it as set.
    const after = await target.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          favorite: isDate("favorite.addedAt"),
          watchlist: isDate("watchlist.addedAt"),
          watched: isDate("watched.watchedAt"),
          rated: { $sum: { $cond: [{ $gt: [{ $ifNull: ["$favorite.personalRating", 0] }, 0] }, 1, 0] } },
        },
      },
    ]).toArray();

  const a = after[0] || {};
  console.log("Audit (read back from the target):");
  console.log(`  documents      : ${a.total ?? 0}`);
  console.log(`  favorited      : ${a.favorite ?? 0}   (planned ${counts.favorite})`);
  console.log(`  on watchlist   : ${a.watchlist ?? 0}   (planned ${counts.watchlist})`);
  console.log(`  watched        : ${a.watched ?? 0}   (planned ${counts.watched})`);
  console.log(`  rated          : ${a.rated ?? 0}   (planned ${counts.rated})`);

  const problems = [];
  if ((a.total ?? 0) !== merged.length) problems.push(`document count ${a.total} != planned ${merged.length}`);
  if ((a.favorite ?? 0) !== counts.favorite) problems.push(`favorite ${a.favorite} != planned ${counts.favorite}`);
  if ((a.watchlist ?? 0) !== counts.watchlist) problems.push(`watchlist ${a.watchlist} != planned ${counts.watchlist}`);
  if ((a.watched ?? 0) !== counts.watched) problems.push(`watched ${a.watched} != planned ${counts.watched}`);

  console.log("");
  if (problems.length) {
    console.log("MISMATCH:");
    for (const p of problems) console.log(`  - ${p}`);
  } else {
    console.log("Every planned count reconciles.");
  }
}

let WRITE_CONFIRMED = WRITE;

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.close();
  });
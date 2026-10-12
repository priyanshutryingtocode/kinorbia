// One-shot. Read-only precondition for dropJournalCollection.mjs, which refuses to run
// without it. Passes trivially once the collection is gone.
//
// `userName` is excluded from the comparison: the rows do not carry it, and no read path
// ever consumed it.
//
//   --dry  check and report
//   --yes  same; exit 1 on any mismatch

import { MongoClient } from "mongodb";

const REPORT = process.argv.includes("--dry");
const GATE = process.argv.includes("--yes");
const URI = process.env.MONGO_MONGODB_URI || process.env.MONGODB_URI;
const DB_NAME = process.env.MONGO_DB_NAME || "test";
const PROBE = "__check_mutations_probe__";

if (REPORT === GATE) {
  console.error("Pass exactly one of --dry (report) or --yes (report and gate).");
  process.exit(1);
}

if (!URI) {
  console.error("MONGO_MONGODB_URI or MONGODB_URI must be set in .env.local");
  process.exit(1);
}

function describeTarget() {
  const host = new URL(URI.replace("mongodb+srv://", "mongodb://")).hostname;
  return `mongodb://${host}/${DB_NAME}`;
}

async function main() {
  const client = new MongoClient(URI);
  await client.connect();
  const db = client.db(DB_NAME);

  try {
    const entries = db.collection("journalentries");
    const rows = db.collection("usermovies");

    // Gone: the completed state. Parity holds vacuously, so this passes.
    const journalExists = await db.listCollections({ name: "journalentries" }).hasNext();

    console.log(`Target: ${describeTarget()}`);
    console.log(`Mode:   ${REPORT ? "REPORT" : "REPORT + GATE"} (read-only)`);
    console.log("");

    if (!journalExists) {
      const watched = await rows.countDocuments({ "watched.watchedAt": { $ne: null } });
      console.log("journalentries: absent (dropped)");
      console.log(`Watched rows in usermovies: ${watched}`);
      console.log("");
      console.log("Nothing to compare. Watch history lives in usermovies and the migration is done.");
      return;
    }

    const journal = await entries
      .find({})
      .project({
        _id: 1,
        userEmail: 1,
        movieId: 1,
        mediaType: 1,
        title: 1,
        posterPath: 1,
        watchedAt: 1,
      })
      .toArray();

    console.log(`Journal entries: ${journal.length}`);

    const problems = [];
    let matched = 0;
    let watchedRows = 0;

    for (const entry of journal) {
      // The journal read a legacy null mediaType as "movie"; the rows store it normalized.
      const mediaType = entry.mediaType || "movie";
      const row = await rows.findOne({
        userEmail: entry.userEmail,
        movieId: entry.movieId,
        mediaType,
      });

      if (!row) {
        problems.push(`${entry.userEmail}: no row for ${mediaType}:${entry.movieId}`);
        continue;
      }
      if (!row.watched?.watchedAt) {
        problems.push(`${entry.userEmail}: ${mediaType}:${entry.movieId} has no watched.watchedAt`);
        continue;
      }
      if (new Date(row.watched.watchedAt).getTime() !== new Date(entry.watchedAt).getTime()) {
        problems.push(
          `${entry.userEmail}: ${mediaType}:${entry.movieId} watched ${row.watched.watchedAt} != journal ${entry.watchedAt}`
        );
        continue;
      }
      matched += 1;
    }

    // The reverse direction: a watched row with no journal entry is equally fatal.
    watchedRows = await rows.countDocuments({ "watched.watchedAt": { $ne: null } });
    const orphans = watchedRows - matched;
    if (orphans !== 0) {
      problems.push(`${orphans} watched row(s) have no journal entry backing them`);
    }

    // Entries with no movieId cannot become rows; the route validator requires one.
    const keyless = await entries.countDocuments({
      $or: [{ movieId: { $exists: false } }, { movieId: null }, { movieId: "" }],
    });
    if (keyless > 0) {
      problems.push(`${keyless} journal entr(ies) have no movieId and cannot be represented as a row`);
    }

    const probeRows = await rows.countDocuments({ userEmail: { $regex: PROBE } });
    if (probeRows > 0) {
      problems.push(`${probeRows} probe row(s) left in usermovies`);
    }

    console.log(`Matched to a row with the same date: ${matched}`);
    console.log(`Watched rows in usermovies:         ${watchedRows}`);
    console.log(`Entries with no movieId:            ${keyless}`);
    console.log(`Probe residue:                      ${probeRows}`);
    console.log("");

    if (problems.length) {
      console.log(`MISMATCH (${problems.length}):`);
      for (const problem of problems.slice(0, 25)) {
        console.log(`  - ${problem}`);
      }
      if (problems.length > 25) {
        console.log(`  ... and ${problems.length - 25} more`);
      }
      console.log("");
      console.log("The journal cannot be dropped yet.");
      process.exitCode = 1;
      return;
    }

    console.log("Every journal entry has a row with the same watched date, and nothing is orphaned.");
    console.log("");
    console.log("Not compared: `userName`, which the rows do not carry. It was written on every");
    console.log("mark and rewritten by the rename cascade, but no read path ever consumed it.");
    console.log("");
    console.log("Next: npm run drop:journal -- --dry");
  } finally {
    await client.close();
  }
}

await main();
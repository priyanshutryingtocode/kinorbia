// One-shot, destructive, not reversible from the database alone. Runs the parity check in a
// child process first and refuses without it. The schema definitions are removed by hand.
//
//   --dry  report, change nothing
//   --yes  run the parity check, then $unset both fields

import { MongoClient } from "mongodb";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DRY = process.argv.includes("--dry");
const WRITE = process.argv.includes("--yes");
const URI = process.env.MONGO_MONGODB_URI || process.env.MONGODB_URI;
const DB_NAME = process.env.MONGO_DB_NAME || "test";

if (DRY === WRITE) {
  console.error("Pass exactly one of --dry (preview) or --yes (write).");
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

// Child process, not an import, so this cannot satisfy its own precondition with a stale
// module.
function runParityCheck() {
  const here = dirname(fileURLToPath(import.meta.url));
  const result = spawnSync(
    process.execPath,
    [join(here, "verifyUserMovieParity.mjs"), "--yes"],
    { stdio: "inherit", env: process.env }
  );
  return result.status === 0;
}

async function main() {
  console.log(`Target: ${describeTarget()}`);
  console.log(`Mode:   ${DRY ? "DRY RUN -- nothing will be written" : "WRITE"}`);
  console.log("");

  // Dry mode first, so the report is the same whether or not this is a write.
  console.log("Parity check:");
  if (!runParityCheck()) {
    console.log("");
    console.error("REFUSING. `usermovies` does not yet hold everything the arrays hold.");
    console.error("Run `npm run backfill:user-movie` and check again.");
    process.exitCode = 1;
    return;
  }
  console.log("");

  // --- plan ---------------------------------------------------------------------
  const client = new MongoClient(URI);
  await client.connect();
  const db = client.db(DB_NAME);

  try {
    const users = db.collection("users");
    const rows = db.collection("usermovies");

    const members = await users
      .find({ $or: [{ favorites: { $exists: true } }, { watchlist: { $exists: true } }] })
      .project({ email: 1, favorites: 1, watchlist: 1 })
      .toArray();

    let favoriteEntries = 0;
    let watchlistEntries = 0;
    for (const member of members) {
      favoriteEntries += member.favorites?.length ?? 0;
      watchlistEntries += member.watchlist?.length ?? 0;
    }

    const totalRows = await rows.countDocuments({});

    console.log("Would remove:");
    console.log(`  User.favorites  on ${members.length} member(s), ${favoriteEntries} entries`);
    console.log(`  User.watchlist  on ${members.length} member(s), ${watchlistEntries} entries`);
    console.log("");
    console.log("Would keep:");
    console.log(`  ${totalRows} usermovies row(s), which is the only remaining copy`);

    if (!members.length) {
      console.log("");
      console.log("Nothing to remove: no member document has either field.");
      return;
    }

    if (DRY) {
      console.log("");
      console.log("Dry run. Nothing written. Re-run with --yes to remove the fields.");
      return;
    }

    // One update for every member, so the drop cannot half-finish.
    const result = await users.updateMany(
      { $or: [{ favorites: { $exists: true } }, { watchlist: { $exists: true } }] },
      { $unset: { favorites: "", watchlist: "" } }
    );

    console.log("");
    console.log(`Removed both fields from ${result.modifiedCount} member(s).`);

    // Re-read rather than trust the write count: a partial drop would leave some
    // member's favorites readable from the arrays and invisible everywhere else.
    const remaining = await users.countDocuments({
      $or: [{ favorites: { $exists: true } }, { watchlist: { $exists: true } }],
    });

    console.log("");
    console.log("Audit (read back from the target):");
    console.log(`  members still holding either field : ${remaining}`);
    console.log(`  usermovies rows                    : ${await rows.countDocuments({})}`);
    console.log("");

    if (remaining > 0) {
      console.log(`MISMATCH: ${remaining} member(s) still have the fields.`);
      process.exitCode = 1;
      return;
    }

    console.log("Dropped cleanly.");
    console.log("");
    console.log("Still to do by hand:");
    console.log("  1. models/User.ts -- remove the two array definitions and their comment");
    console.log("  2. models/shared.ts -- its _id comment compares MovieList against the arrays");
    console.log("  3. scripts/resetDb.mjs -- stop setting favorites/watchlist to []");
    console.log("  4. scripts/seedData.mjs -- buildUserDocs no longer writes the arrays");
    console.log("  5. npm run reset:db && npm run seed:data");
  } finally {
    await client.close();
  }
}

await main();
import { MongoClient } from "mongodb";

// One pass over the two collections that stored a film or show under a field
// name the rest of the app no longer uses.
//
//   1. reviews / journalentries: `movieTitle` -> `title`
//   2. journalentries: unset a stale `watchedOn` left by an earlier rename
//   3. drop the two indexes that were built on `watchedOn`
//
// Run with: node scripts/backfillMovieTitle.mjs
//   npm run backfill:title            (asks before writing)
//   npm run backfill:title -- --yes   (non-interactive)
//   npm run backfill:title -- --dry   (report and change nothing)
//
// The `title` half of the rename filter is load-bearing rather than defensive:
// `$rename` raises if the target field already exists, so a filter that only
// matched on `movieTitle` would throw partway through a second run instead of
// quietly matching nothing.

const uri = process.env.MONGO_MONGODB_URI || process.env.MONGODB_URI;
if (!uri) {
  throw new Error("MONGO_MONGODB_URI / MONGODB_URI not set in environment.");
}

const ASSUME_YES = process.argv.includes("--yes");
const DRY_RUN = process.argv.includes("--dry");

const RENAMED = ["reviews", "journalentries"];
const STALE_FIELD = "watchedOn";
// Both were built against `watchedOn` before that field was renamed to
// `watchedAt`. The first is redundant: the correct unique index below is already
// present and enforced. The second covers a field 458 of 469 documents never had.
const STALE_INDEXES = [
  { userEmail: 1, movieId: 1, mediaType: 1, watchedOn: 1 },
  { userEmail: 1, watchedOn: -1, _id: -1 },
];

function describeTarget(connectionString) {
  try {
    const parsed = new URL(connectionString);
    const name = parsed.pathname.replace(/^\//, "").split("?")[0];
    return { host: parsed.host, database: name || "test" };
  } catch {
    return { host: "unparseable URI", database: "test" };
  }
}

// MongoDB's default index name is each key's field then its direction, joined by
// underscores: { userEmail: 1, watchedOn: -1 } is `userEmail_1_watchedOn_-1`.
// Getting this backwards makes `dropIndex` a no-op that reports success, which is
// why the --dry preview exists.
function keyOf(spec) {
  return Object.entries(spec)
    .map(([field, direction]) => `${field}_${direction}`)
    .join("_");
}

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
let exitCode = 0;

try {
  await client.connect();
  const db = client.db(describeTarget(uri).database);

  // --- before ---------------------------------------------------------------

  console.log("Before:");
  const before = {};
  for (const name of RENAMED) {
    const col = db.collection(name);
    before[name] = {
      total: await col.countDocuments({}),
      old: await col.countDocuments({ movieTitle: { $exists: true } }),
      alreadyNew: await col.countDocuments({ title: { $exists: true } }),
    };
    console.log(
      `  ${name.padEnd(16)} ${String(before[name].total).padStart(5)} docs   ` +
        `movieTitle=${String(before[name].old).padStart(5)}   title=${before[name].alreadyNew}`
    );
  }

  const journal = db.collection("journalentries");
  const staleField = await journal.countDocuments({ [STALE_FIELD]: { $exists: true } });
  const liveIndexes = await journal.indexes();
  const staleIndexes = STALE_INDEXES.map((spec) => ({
    spec,
    name: keyOf(spec),
    present: liveIndexes.some((index) => index.name === keyOf(spec)),
  }));
  console.log(`  stale ${STALE_FIELD} field: ${staleField} journal documents`);
  console.log(
    `  stale indexes:     ${staleIndexes.filter((i) => i.present).map((i) => i.name).join(", ") || "none present"}`
  );

  const renameFilter = { movieTitle: { $exists: true }, title: { $exists: false } };
  const willRename = [];
  for (const name of RENAMED) {
    willRename.push([name, await db.collection(name).countDocuments(renameFilter)]);
  }
  const totalRename = willRename.reduce((sum, [, n]) => sum + n, 0);

  console.log(`\nPlanned: rename ${totalRename} document(s)` + willRename.map(([n, c]) => ` (${n}: ${c})`).join(""));

  if (totalRename === 0 && staleField === 0 && !staleIndexes.some((i) => i.present)) {
    console.log("\nNothing to do. The data is already in the shape this script produces.");
    process.exit(0);
  }

  // --- confirm --------------------------------------------------------------

  const target = describeTarget(uri);
  console.log("\nAbout to write to:");
  console.log(`  host:     ${target.host}`);
  console.log(`  database: ${target.database}`);

  if (DRY_RUN) {
    console.log("\nDry run: nothing was written.");
    process.exit(0);
  }

  if (!ASSUME_YES) {
    if (!process.stdin.isTTY) {
      throw new Error("Refusing to write without confirmation. Re-run with --yes.");
    }
    const rl = await import("node:readline/promises");
    const answer = await rl.default
      .createInterface({ input: process.stdin, output: process.stdout })
      .question(`Rename ${totalRename} documents and clean up ${STALE_FIELD}? Type "yes" to continue: `);
    if (answer.trim().toLowerCase() !== "yes") {
      throw new Error("Cancelled.");
    }
  }

  // --- write ----------------------------------------------------------------

  for (const [name] of willRename) {
    const result = await db.collection(name).updateMany(renameFilter, {
      $rename: { movieTitle: "title" },
    });
    console.log(`  renamed ${result.modifiedCount} document(s) in ${name}`);
  }

  const unset = await journal.updateMany({ [STALE_FIELD]: { $exists: true } }, {
    $unset: { [STALE_FIELD]: "" },
  });
  console.log(`  unset ${STALE_FIELD} on ${unset.modifiedCount} document(s)`);

  for (const index of staleIndexes) {
    if (!index.present) continue;
    try {
      await journal.dropIndex(index.name);
      console.log(`  dropped index ${index.name}`);
    } catch (error) {
      console.warn(`  could not drop ${index.name}: ${error?.message || error}`);
    }
  }

  // --- after ----------------------------------------------------------------

  console.log("\nAfter:");
  const failures = [];
  for (const name of RENAMED) {
    const col = db.collection(name);
    const old = await col.countDocuments({ movieTitle: { $exists: true } });
    const now = await col.countDocuments({ title: { $exists: true } });
    const both = await col.countDocuments({
      movieTitle: { $exists: true },
      title: { $exists: true },
    });
    console.log(`  ${name.padEnd(16)} movieTitle=${old}   title=${String(now).padStart(5)}   both=${both}`);
    if (old !== 0) failures.push(`${name} still has ${old} document(s) named movieTitle`);
    if (both !== 0) failures.push(`${name} has ${both} document(s) carrying both names`);
    if (now !== before[name].total) {
      failures.push(`${name} has ${now} titled documents, expected ${before[name].total}`);
    }
  }

  const afterStale = await journal.countDocuments({ [STALE_FIELD]: { $exists: true } });
  const afterIndexes = await journal.indexes();
  for (const index of staleIndexes) {
    if (afterIndexes.some((i) => i.name === index.name)) {
      failures.push(`index ${index.name} is still present`);
    }
  }
  console.log(`  stale ${STALE_FIELD} field: ${afterStale} journal documents`);

  if (failures.length > 0) {
    console.error("\nPost-migration audit FAILED:");
    for (const failure of failures) console.error(`  - ${failure}`);
    exitCode = 1;
  } else {
    console.log("\nAudit passed: no document carries both names or neither, and the stale field and indexes are gone.");
  }
} catch (error) {
  exitCode = 1;
  console.error("\nMigration failed:", error?.message || error);
} finally {
  await client.close();
}

process.exit(exitCode);
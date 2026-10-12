// One-shot, destructive. Watch history now lives in usermovies. Runs the parity check in a
// child process first and refuses without it. The model was removed by hand.
//
//   --dry  report only
//   --yes  check, then drop

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

function runParityCheck() {
  const here = dirname(fileURLToPath(import.meta.url));
  const result = spawnSync(
    process.execPath,
    [join(here, "verifyWatchedParity.mjs"), "--yes"],
    { stdio: "inherit", env: process.env }
  );
  return result.status === 0;
}

async function main() {
  console.log(`Target: ${describeTarget()}`);
  console.log(`Mode:   ${DRY ? "DRY RUN -- nothing will be written" : "WRITE"}`);
  console.log("");

  console.log("Parity check:");
  if (!runParityCheck()) {
    console.log("");
    console.error("REFUSING. `usermovies` does not yet hold every watch in `journalentries`.");
    process.exitCode = 1;
    return;
  }
  console.log("");

  const client = new MongoClient(URI);
  await client.connect();
  const db = client.db(DB_NAME);

  try {
    const entries = db.collection("journalentries");

    const total = await entries.countDocuments({});
    const members = await entries.distinct("userEmail");

    console.log("Would drop:");
    console.log(`  journalentries: ${total} entries across ${members.length} member(s)`);
    console.log("");
    console.log("Would keep:");
    console.log(
      `  ${await db.collection("usermovies").countDocuments({})} usermovies row(s), which is the only remaining copy`
    );

    if (!total) {
      console.log("");
      console.log("Nothing to drop: the collection is already empty or absent.");
      return;
    }

    if (DRY) {
      console.log("");
      console.log("Dry run. Nothing written. Re-run with --yes to drop the collection.");
      return;
    }

    // drop() rather than deleteMany(): the collection and its two indexes go with it,
    // and there is nothing in it worth keeping the shell of.
    await db.collection("journalentries").drop();
    console.log("");
    console.log("Dropped journalentries.");

    const remaining = await db.listCollections({ name: "journalentries" }).hasNext();
    console.log("");
    console.log("Audit (read back from the target):");
    console.log(`  collection still present: ${remaining}`);
    console.log(`  usermovies rows:          ${await db.collection("usermovies").countDocuments({})}`);
    console.log("");

    if (remaining) {
      console.log("MISMATCH: the collection is still there.");
      process.exitCode = 1;
      return;
    }

    console.log("Dropped cleanly.");
  } finally {
    await client.close();
  }
}

await main();
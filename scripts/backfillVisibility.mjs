// Stamp `visibility: "public"` on rows that predate the field.
//
// The schema defaults `visibility` to "public", so every Mongoose-written document
// carries it; the seeded/legacy rows do not, which is why the read filters kept a
// `{ visibility: { $exists: false } }` arm to keep them visible. This backfill stamps
// the missing rows with the same value the schema would have written, so that arm can
// be dropped and the visibility-prefixed indexes work on every row.
//
//   npm run backfill:visibility            report only, writes nothing
//   npm run backfill:visibility -- --yes   stamp the missing rows
//
// Rows whose visibility is present but not "public" or "private" are reported, never
// rewritten: they would vanish from every read once the fallback arm is dropped, and
// a wrong guess is worse than a row an operator looks at by hand.

import { MongoClient } from "mongodb";

const YES = process.argv.includes("--yes");
const URI = process.env.MONGO_MONGODB_URI || process.env.MONGODB_URI;
const DB_NAME = process.env.MONGO_DB_NAME || "test";

if (!URI) {
  console.error("MONGODB_URI or MONGO_MONGODB_URI must be set in .env.local");
  process.exit(1);
}

const COLLECTIONS = ["reviews", "movielists"];

const client = new MongoClient(URI);

const missingFilter = { visibility: { $exists: false } };
const anomalousFilter = {
  visibility: { $exists: true, $not: { $in: ["public", "private"] } },
};

let totalMissing = 0;
let totalAnomalous = 0;

try {
  await client.connect();
  const db = client.db(DB_NAME);

  for (const name of COLLECTIONS) {
    const collection = db.collection(name);
    const missing = await collection.countDocuments(missingFilter);
    const anomalous = await collection.countDocuments(anomalousFilter);
    totalMissing += missing;
    totalAnomalous += anomalous;

    console.log(`\n${name}: ${missing} missing visibility, ${anomalous} anomalous`);

    const sample = await collection
      .find(anomalousFilter, { projection: { visibility: 1, userEmail: 1 } })
      .limit(10)
      .toArray();
    for (const doc of sample) {
      console.log(`  anomalous _id=${doc._id} visibility=${JSON.stringify(doc.visibility)} userEmail=${doc.userEmail ?? "?"}`);
    }
  }

  if (totalMissing === 0) {
    console.log("\nnothing to stamp.");
    process.exit(0);
  }

  if (!YES) {
    console.log("\nDry run. Nothing written. Re-run with --yes to apply.");
    process.exit(0);
  }

  for (const name of COLLECTIONS) {
    const collection = db.collection(name);
    const result = await collection.updateMany(missingFilter, { $set: { visibility: "public" } });
    const remaining = await collection.countDocuments(missingFilter);
    console.log(`\n${name}: stamped ${result.modifiedCount}, ${remaining} still missing`);
    if (remaining > 0) {
      process.exitCode = 1;
    }
  }

  if (totalAnomalous > 0) {
    console.log("\nanomalous rows were NOT rewritten; fix them by hand before dropping the $exists arm.");
  }
} finally {
  await client.close().catch(() => {});
}

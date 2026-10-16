// Compares the indexes each model declares against what is on the server. Read-only.
//
// Exists to catch a name mismatch that LOOKS like a stale index and is not: the server
// holds a declared key under an older mongoose's name. MongoDB rejects the same key
// under a second name (IndexOptionsConflict 85), so autoIndex cannot repair it and the
// oddly-named one is the only coverage those queries have. Do not "tidy" it.
//
//   (no flag)  report
//   --strict   also exit 1 on drift

import { MongoClient } from "mongodb";

const STRICT = process.argv.includes("--strict");
const URI = process.env.MONGO_MONGODB_URI || process.env.MONGODB_URI;
const DB_NAME = process.env.MONGO_DB_NAME || "test";

if (!URI) {
  console.error("MONGO_MONGODB_URI or MONGODB_URI must be set in .env.local");
  process.exit(1);
}

// What each model declares, read from the live schema rather than restated here: this file
// should not be a second place to update when an index changes.
//
// Returns the connection too, so the caller can close it. An open mongoose connection keeps
// the event loop alive and the process never exits, which reads as a hang rather than a
// script that forgot to tidy up.
async function declaredIndexes() {
  const { default: dbConnect } = await import("../lib/dbConnect.ts");
  const conn = await dbConnect();

  const models = [
    (await import("../models/User.ts")).default,
    (await import("../models/UserMovie.ts")).default,
    (await import("../models/Review.ts")).default,
    (await import("../models/MovieList.ts")).default,
    (await import("../models/Comment.ts")).default,
    (await import("../models/Notification.ts")).default,
    (await import("../models/Conversation.ts")).default,
  ];

  // `schema.indexes()` returns pairs with no generated name; this is mongoose's convention.
  const mongooseName = (fields) =>
    Object.entries(fields).map(([field, direction]) => `${field}_${direction}`).join("_");

  const declared = models.map((model) => ({
    name: model.collection.collectionName || model.collection.name,
    declared: model.schema.indexes().map(([fields, options]) => ({
      name: options.name ?? mongooseName(fields),
      key: fields,
      unique: Boolean(options.unique),
      partial: options.partialFilterExpression ?? null,
    })),
  }));

  return { declared, conn };
}

async function main() {
  console.log(`Target: mongodb://${new URL(URI.replace("mongodb+srv://", "mongodb://")).hostname}/${DB_NAME}`);
  console.log(`Mode:   ${STRICT ? "STRICT (exit 1 on any drift)" : "report"}`);
  console.log("");

  const { declared, conn } = await declaredIndexes();
  const client = new MongoClient(URI);
  await client.connect();
  const db = client.db(DB_NAME);

  // Mismatches that are understood and deliberately left alone. Each needs a reason,
  // because "it was like that when I got here" is how a real index problem starts.
  const KNOWN = {
    "1_visibility_-1_createdAt_-1__id":
      "created by an older mongoose that named indexes differently; the key is what the " +
      "schema declares, and MongoDB refuses the same key under a second name (85)",
    "1_userEmail_-1_createdAt_-1__id":
      "created by an older mongoose that named indexes differently; the key is what the " +
      "schema declares, and MongoDB refuses the same key under a second name (85)",
  };

  let unknown = 0;
  let known = 0;

  try {
    for (const model of declared) {
      const live = (await db.collection(model.name).indexes()).filter((i) => i.name !== "_id_");
      // Identity is key PLUS partial filter. Two indexes differing only by their filter
      // are different indexes -- the activity feed's `watched.broadcast` one and a plain
      // one on the same fields -- so keying on the pattern alone would let one mask the
      // other and hide a mismatch.
      const identity = (i) => JSON.stringify([i.key, i.partialFilterExpression ?? null]);
      const liveById = new Map(live.map((i) => [identity(i), i]));

      console.log(`${model.name}:`);

      for (const want of model.declared) {
        const key = JSON.stringify(want.key);
        const have = liveById.get(JSON.stringify([want.key, want.partial]));

        if (!have) {
          // The common cause is a live index on the same key with a different filter.
          const sameKey = live.find((i) => JSON.stringify(i.key) === key);
          if (sameKey) {
            console.log(`  FILTER    ${want.name}  ${key}`);
            console.log(`            server: ${JSON.stringify(sameKey.partialFilterExpression ?? null)}`);
            console.log(`            schema: ${JSON.stringify(want.partial)}`);
            unknown += 1;
          } else {
            console.log(`  MISSING   ${want.name}  ${key}`);
            unknown += 1;
          }
          continue;
        }
        if (have.name === want.name) {
          console.log(`  ok        ${have.name}`);
        } else if (KNOWN[have.name]) {
          console.log(`  renamed   server="${have.name}"  schema="${want.name}"`);
          console.log(`            known: ${KNOWN[have.name]}`);
          known += 1;
        } else {
          console.log(`  UNKNOWN   server="${have.name}"  schema="${want.name}"  ${key}`);
          unknown += 1;
        }
      }

      // An index the schema does not declare at all. Not automatically wrong -- a partial
      // or TTL index added by hand is legitimate -- but it should be a decision.
      const declaredIds = new Set(model.declared.map((d) => JSON.stringify([d.key, d.partial])));
      for (const index of live) {
        if (!declaredIds.has(identity(index)) && !KNOWN[index.name]) {
          console.log(`  UNDECLARED ${index.name}  ${JSON.stringify(index.key)}`);
          unknown += 1;
        }
      }

      console.log("");
    }
  } finally {
    await client.close();
    // dbConnect() returns the mongoose instance, so the socket is on .connection.
    await conn.connection.close();
  }

  console.log(`Known name mismatches (left alone): ${known}`);
  console.log(`Unexplained problems:                ${unknown}`);
  console.log("");

  if (unknown === 0) {
    console.log("Every declared index is present, and every server index is accounted for.");
    if (known > 0) {
      console.log("");
      console.log("The renamed ones are load-bearing: MongoDB will not recreate them under the");
      console.log("schema's name (IndexOptionsConflict 85), so dropping them would leave those");
      console.log("queries unindexed. Confirm with an explain() before touching one.");
    }
    return;
  }

  console.log("Reconcile these before trusting the index set.");
  if (STRICT) process.exitCode = 1;
}

await main();
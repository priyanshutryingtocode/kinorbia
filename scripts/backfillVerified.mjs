import { MongoClient } from "mongodb";

const uri = process.env.MONGO_MONGODB_URI || process.env.MONGODB_URI;
if (!uri) {
  throw new Error("MONGO_MONGODB_URI / MONGODB_URI not set in environment.");
}

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
await client.connect();

try {
  const db = client.db();

  // One-time migration: email verification is now enforced at login, so
  // mark every pre-existing account as verified. Run once before deploying
  // the enforcement change (npm run backfill:verified).
  const result = await db.collection("users").updateMany(
    { $or: [{ emailVerified: null }, { emailVerified: { $exists: false } }] },
    { $set: { emailVerified: new Date() } }
  );
  console.log(`users: marked ${result.modifiedCount} existing accounts as verified`);

  // Remove duplicate journal entries that raced past the old non-unique upsert,
  // keeping the earliest created doc per (userEmail, movieId, mediaType).
  const journal = db.collection("journalentries");
  const dupes = await journal
    .aggregate([
      {
        $group: {
          _id: {
            userEmail: "$userEmail",
            movieId: "$movieId",
            mediaType: { $ifNull: ["$mediaType", "movie"] },
          },
          ids: { $push: "$_id" },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray();

  let removedDupes = 0;
  for (const group of dupes) {
    if (!group._id.movieId) continue; // manual entries have no movieId; keep all
    const [, ...staleIds] = group.ids;
    const res = await journal.deleteMany({ _id: { $in: staleIds } });
    removedDupes += res.deletedCount;
  }
  console.log(`journalentries: removed ${removedDupes} duplicates`);
  console.log("Done.");
} finally {
  await client.close();
}

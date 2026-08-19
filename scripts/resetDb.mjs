import { MongoClient } from "mongodb";

const uri = process.env.MONGO_MONGODB_URI || process.env.MONGODB_URI;
if (!uri) {
  throw new Error("MONGO_MONGODB_URI / MONGODB_URI not set in environment.");
}

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
await client.connect();

try {
  const db = client.db();

  const contentCollections = ["journalentries", "movielists", "reviews", "conversations"];
  for (const name of contentCollections) {
    const before = await db.collection(name).countDocuments({});
    const result = await db.collection(name).deleteMany({});
    console.log(`${name}: ${before} docs -> removed ${result.deletedCount}`);
  }

  const usersResult = await db.collection("users").updateMany(
    {},
    { $set: { favorites: [], watchlist: [] } }
  );
  console.log(`users: reset content on ${usersResult.modifiedCount} docs`);

  console.log("Done. Accounts and login data preserved.");
} finally {
  await client.close();
}

import { MongoClient } from "mongodb";

const uri = process.env.MONGO_MONGODB_URI || process.env.MONGODB_URI;
if (!uri) {
  throw new Error("MONGO_MONGODB_URI / MONGODB_URI not set in environment.");
}

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
await client.connect();

try {
  const db = client.db();

  // `usermovies` is where favorites, watchlist and watched state now live, so emptying the
// embedded arrays without clearing it would leave every member looking favorited while
// their profile, counts and insights all read the rows.
const contentCollections = ["usermovies", "movielists", "reviews", "conversations"];
  for (const name of contentCollections) {
    const before = await db.collection(name).countDocuments({});
    const result = await db.collection(name).deleteMany({});
    console.log(`${name}: ${before} docs -> removed ${result.deletedCount}`);
  }

  // The counters are what the caps are enforced against, so they have to return to zero
  // with the rows or the next member to fill a list would be told theirs is already full.
  const usersResult = await db.collection("users").updateMany(
    {},
    { $set: { favoritesCount: 0, watchlistCount: 0 } }
  );
  console.log(`users: reset content on ${usersResult.modifiedCount} docs`);

  console.log("Done. Accounts and login data preserved.");
} finally {
  await client.close();
}

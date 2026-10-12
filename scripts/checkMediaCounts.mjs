// The caps are enforced against denormalized counters on the member, and nothing recomputes
// them on a schedule. A counter that runs high refuses an add the member has room for.
//
//   (no flag)  report, exit 0 always
//   --strict   exit 1 on any drift
//   --fix      reconcile from the rows, which are the source of truth

import { MongoClient } from "mongodb";

const STRICT = process.argv.includes("--strict");
const FIX = process.argv.includes("--fix");
const URI = process.env.MONGO_MONGODB_URI || process.env.MONGODB_URI;
const DB_NAME = process.env.MONGO_DB_NAME || "test";
const PROBE = "__check_mutations_probe__";

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
    const users = db.collection("users");
    const rows = db.collection("usermovies");

    // Derived from the rows, which are the source of truth.
    const actual = new Map(
      (
        await rows
          .aggregate([
            {
              $group: {
                _id: "$userEmail",
                favorites: { $sum: { $cond: [{ $ne: ["$favorite.addedAt", null] }, 1, 0] } },
                watchlist: { $sum: { $cond: [{ $ne: ["$watchlist.addedAt", null] }, 1, 0] } },
              },
            },
          ])
          .toArray()
      ).map((r) => [r._id, r])
    );

    const members = await users
      .find({})
      .project({ email: 1, favoritesCount: 1, watchlistCount: 1 })
      .toArray();

    console.log(`Target: ${describeTarget()}`);
    console.log(`Mode:   ${FIX ? "FIX" : STRICT ? "STRICT (exit 1 on drift)" : "report"}`);
    console.log("");
    console.log(`Members: ${members.length}`);
    console.log(`usermovies rows: ${await rows.countDocuments({})}`);
    console.log("");

    const drift = [];

    for (const member of members) {
      const real = actual.get(member.email) ?? { favorites: 0, watchlist: 0 };
      const storedF = member.favoritesCount ?? 0;
      const storedW = member.watchlistCount ?? 0;

      if (storedF !== real.favorites || storedW !== real.watchlist) {
        drift.push({
          email: member.email,
          storedF,
          realF: real.favorites,
          storedW,
          realW: real.watchlist,
        });
      }
    }

    for (const d of drift) {
      console.log(
        `  ${d.email}: favorites ${d.storedF} -> ${d.realF}, watchlist ${d.storedW} -> ${d.realW}`
      );
    }

    // A row belonging to nobody, or nobody's counters covering a row that does not exist,
    // is the same class of problem and shows up here.
    const probeRows = await rows.countDocuments({ userEmail: { $regex: PROBE } });
    if (probeRows > 0) console.log(`  ${probeRows} probe row(s) left in usermovies`);

    console.log("");

    if (!drift.length) {
      console.log("Every counter matches the rows.");
      return;
    }

    if (!FIX) {
      console.log(`${drift.length} member(s) disagree with the rows.`);
      console.log("Re-run with --fix to rebuild the counters from usermovies.");
      if (STRICT) process.exitCode = 1;
      return;
    }

    for (const d of drift) {
      await users.updateOne(
        { email: d.email },
        { $set: { favoritesCount: d.realF, watchlistCount: d.realW } }
      );
    }

    // Re-read rather than trust the write count.
    let remaining = 0;
    for (const member of members) {
      const real = actual.get(member.email) ?? { favorites: 0, watchlist: 0 };
      const now = await users.findOne(
        { email: member.email },
        { projection: { favoritesCount: 1, watchlistCount: 1 } }
      );
      if ((now?.favoritesCount ?? 0) !== real.favorites || (now?.watchlistCount ?? 0) !== real.watchlist) {
        remaining += 1;
      }
    }

    console.log(`Fixed ${drift.length} member(s); ${remaining} still disagree.`);
    if (remaining > 0) process.exitCode = 1;
  } finally {
    await client.close();
  }
}

await main();
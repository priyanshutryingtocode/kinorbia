// Structural and referential integrity of the live database.
//
// Read-only by construction: this file calls find/aggregate/distinct/listCollections and
// nothing else. There is no --fix and deliberately no transaction support, because a
// checker that can write is a checker that can be run destructively by accident.
//
// Three things drift silently here and are otherwise invisible until a member sees it:
// a row whose owning member no longer exists, a row the schema would now refuse, and a
// counter that has walked past the cap it exists to enforce.
//
// It cannot tell you whether a cached TMDB title still matches the API today, or whether
// a rating is sensible -- only that the rows hang together and point at real things.
//
//   (no flag)  report, exit 0 always
//   --strict   exit 1 on any ERROR

import { MongoClient } from "mongodb";

const STRICT = process.argv.includes("--strict");
const URI = process.env.MONGO_MONGODB_URI || process.env.MONGODB_URI;
const DB_NAME = process.env.MONGO_DB_NAME || "test";
// Rows the write-path gate creates and aborts; a survivor means it leaked.
const PROBE = "__check_mutations_probe__";
const MAX_FAVORITES = 2500;
const MAX_WATCHLIST = 2500;

if (!URI) {
  console.error("MONGO_MONGODB_URI or MONGODB_URI must be set in .env.local");
  process.exit(1);
}

// Mongoose pluralizes the model name; no model in /models pins `collection:`.
const EXPECTED = [
  "users",
  "usermovies",
  "reviews",
  "comments",
  "notifications",
  "movielists",
  "conversations",
];

const errors = [];
const warnings = [];

// A repeated finding is reported once with a count rather than 600 times: 668 rows can
// otherwise produce 668 near-identical lines that hide the one finding that mattered.
const MAX_PER_CHECK = 20;

function fail(check, detail) {
  errors.push({ check, detail });
}

function warn(check, detail) {
  warnings.push({ check, detail });
}

function render(list, label) {
  if (!list.length) return;
  console.log(`${label} (${list.length})`);
  const byCheck = new Map();
  for (const entry of list) {
    if (!byCheck.has(entry.check)) byCheck.set(entry.check, []);
    byCheck.get(entry.check).push(entry.detail);
  }
  for (const [check, details] of byCheck) {
    for (const detail of details.slice(0, MAX_PER_CHECK)) {
      console.log(`  ${check}: ${detail}`);
    }
    if (details.length > MAX_PER_CHECK) {
      console.log(`  ${check}: ... and ${details.length - MAX_PER_CHECK} more of the same`);
    }
  }
}

// Emails are compared case-insensitively because the write paths normalize through
// emailCandidates() and the read paths match the same way.
function normalize(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : email;
}

async function main() {
  const client = new MongoClient(URI);
  await client.connect();
  const db = client.db(DB_NAME);

  try {
    const users = db.collection("users");
    const rows = db.collection("usermovies");
    const reviews = db.collection("reviews");
    const comments = db.collection("comments");
    const notifications = db.collection("notifications");
    const lists = db.collection("movielists");
    const conversations = db.collection("conversations");

    const host = new URL(URI.replace("mongodb+srv://", "mongodb://")).hostname;
    console.log(`Target: mongodb://${host}/${DB_NAME}`);
    console.log(`Mode:   ${STRICT ? "STRICT (exit 1 on ERROR)" : "report"}`);
    console.log("");

    // ---- collection inventory ------------------------------------------------

    const present = (await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name);
    const undeclared = present.filter((n) => !EXPECTED.includes(n));
    for (const name of undeclared) {
      warn(
        "undeclared collection",
        `${name} has no model in /models -- a deleted model recreated it via autoIndex, or it is leftover`
      );
    }

    const counts = {};
    for (const name of EXPECTED) {
      counts[name] = present.includes(name) ? await db.collection(name).countDocuments({}) : null;
    }
    for (const [name, n] of Object.entries(counts)) {
      if (n === null) warn("missing collection", `${name} is declared by a model but not on the server`);
    }

    // ---- member set, fetched once -------------------------------------------

    const memberRows = await users.find({}, { projection: { email: 1 } }).toArray();
    const members = new Set(memberRows.map((m) => normalize(m.email)));

    // ---- referential integrity ----------------------------------------------

    // Counted per distinct email server-side, so only one entry per member crosses the wire
    // rather than one per document.
    const orphansIn = async (collection, field, label) => {
      if (!present.includes(collection)) return;
      const agg = await collection
        .aggregate([{ $group: { _id: `$${field}`, n: { $sum: 1 } } }])
        .toArray();
      // Normalization is applied in Node because $toLower cannot express trim.
      const seen = new Map();
      for (const { _id, n } of agg) {
        const key = normalize(_id);
        if (key && !members.has(key)) seen.set(key, (seen.get(key) ?? 0) + n);
      }
      for (const [email, n] of seen) fail(`${label} orphaned`, `${n} row(s) for ${email}, which is not a member`);
    };

    await orphansIn(rows, "userEmail", "usermovies");
    await orphansIn(reviews, "userEmail", "reviews");
    await orphansIn(comments, "userEmail", "comments");
    await orphansIn(notifications, "userEmail", "notifications (recipient)");
    await orphansIn(notifications, "actorEmail", "notifications (actor)");
    await orphansIn(conversations, "userEmail", "conversations");

    // Comments hang off a review or a list; the parent is named by parentType.
    if (present.includes("comments")) {
      const reviewIds = new Set((await reviews.find({}, { projection: { _id: 1 } }).toArray()).map((r) => String(r._id)));
      const listIds = new Set((await lists.find({}, { projection: { _id: 1 } }).toArray()).map((r) => String(r._id)));

      const dangling = await comments
        .find({}, { projection: { parentType: 1, parentId: 1 } })
        .toArray();

      for (const c of dangling) {
        const id = String(c.parentId ?? "");
        const parent = c.parentType === "review" ? reviewIds : c.parentType === "list" ? listIds : null;
        if (parent && !parent.has(id)) {
          fail("comment orphaned", `comment ${id} points at a ${c.parentType} that does not exist`);
        }
      }
    }

    // A notification stores its target as a String because a follow's target is an email
    // and a review's is an ObjectId, so it resolves per targetType.
    if (present.includes("notifications")) {
      const feed = await notifications
        .find({ targetType: { $exists: true, $ne: "user" } }, { projection: { targetType: 1, targetId: 1 } })
        .toArray();

      const reviewIds = new Set((await reviews.find({}, { projection: { _id: 1 } }).toArray()).map((r) => String(r._id)));
      const listIds = new Set((await lists.find({}, { projection: { _id: 1 } }).toArray()).map((r) => String(r._id)));

      for (const n of feed) {
        const id = String(n.targetId ?? "");
        if (!id) continue;
        const pool = n.targetType === "review" ? reviewIds : n.targetType === "list" ? listIds : null;
        if (pool && !pool.has(id)) {
          warn("notification target gone", `notification points at a ${n.targetType} ${id} that no longer exists`);
        }
      }
    }

    // One conversation per member; the unique index forbids more.
    if (present.includes("conversations")) {
      const dupes = await conversations
        .aggregate([
          { $group: { _id: { $toLower: "$userEmail" }, n: { $sum: 1 } } },
          { $match: { n: { $gt: 1 } } },
        ])
        .toArray();
      for (const d of dupes) {
        fail("conversations duplicated", `${d.n} conversation(s) for ${d._id}; the unique index should prevent this`);
      }
    }

    // ---- usermovies conformance ---------------------------------------------

    if (present.includes("usermovies")) {
      const movieRows = await rows.find({}).toArray();

      for (const r of movieRows) {
        const where = `${normalize(r.userEmail)} / ${r.movieId} / ${r.mediaType}`;

        if (typeof r.movieId !== "string" || !r.movieId) {
          fail("usermovies", `${where}: movieId is not a non-empty string`);
        }
        if (typeof r.title !== "string" || !r.title.trim()) {
          fail("usermovies", `${where}: title is missing or empty, which the schema requires`);
        }
        if (r.mediaType !== "movie" && r.mediaType !== "tv") {
          fail("usermovies", `${where}: mediaType is outside the enum ["movie","tv"]`);
        }

        // An empty sub-document is normal: mongoose materialises `favorite: {}` whether or
        // not the state is on, and every read path keys off the timestamp. Only a sub-doc
        // carrying content but no timestamp is contradictory -- a rating on a title that is
        // not a favorite, which no write path can produce.
        if (r.favorite?.addedAt) {
          const rating = r.favorite.personalRating;
          if (typeof rating === "number" && rating !== 0 && (rating < 1 || rating > 10)) {
            fail("usermovies", `${where}: personalRating ${rating} is outside 1-10`);
          }
        } else if (typeof r.favorite?.personalRating === "number" && r.favorite.personalRating > 0) {
          fail("usermovies", `${where}: personalRating ${r.favorite.personalRating} with no favorite.addedAt`);
        }
      }

      // The unique index should make these impossible; a hit means the index is missing
      // or its partial filter is not matching the rows.
      const dupes = await rows
        .aggregate([
          { $group: { _id: { userEmail: "$userEmail", movieId: "$movieId", mediaType: "$mediaType" }, n: { $sum: 1 } } },
          { $match: { n: { $gt: 1 } } },
          { $limit: 20 },
        ])
        .toArray();
      for (const d of dupes) {
        fail("usermovies duplicated", `${d.n} rows share (${d._id.userEmail}, ${d._id.movieId}, ${d._id.mediaType})`);
      }

      const probeRows = await rows.countDocuments({ userEmail: { $regex: PROBE } });
      if (probeRows > 0) fail("probe row leaked", `${probeRows} row(s) from the write-path gate survived its abort`);
    }

    // ---- members ------------------------------------------------------------

    if (present.includes("users")) {
      const full = await users.find({}, { projection: { email: 1, name: 1, username: 1 } }).toArray();
      const usernames = new Map();

      for (const u of full) {
        const email = normalize(u.email);
        if (!email) fail("users", "a member has no email, which the schema requires");
        if (typeof u.name !== "string" || !u.name.trim()) {
          fail("users", `${email || "(no email)"}: name is missing or empty`);
        }
        if (u.username) {
          if (usernames.has(u.username)) {
            fail("users", `username "${u.username}" is held by ${usernames.get(u.username) || "(no email)"} and ${email}`);
          } else {
            usernames.set(u.username, email);
          }
        }
      }
    }

    // ---- caps ---------------------------------------------------------------

    if (present.includes("usermovies") && present.includes("users")) {
      const perMember = await rows
        .aggregate([
          { $match: { "favorite.addedAt": { $ne: null } } },
          { $group: { _id: "$userEmail", n: { $sum: 1 } } },
        ])
        .toArray();
      const favBy = new Map(perMember.map((r) => [normalize(r._id), r.n]));

      const wl = await rows
        .aggregate([
          { $match: { "watchlist.addedAt": { $ne: null } } },
          { $group: { _id: "$userEmail", n: { $sum: 1 } } },
        ])
        .toArray();
      const wlBy = new Map(wl.map((r) => [normalize(r._id), r.n]));

      for (const email of members) {
        const f = favBy.get(email) ?? 0;
        const w = wlBy.get(email) ?? 0;
        if (f > MAX_FAVORITES) fail("cap exceeded", `${email} has ${f} favorites, over the ${MAX_FAVORITES} cap`);
        if (w > MAX_WATCHLIST) fail("cap exceeded", `${email} has ${w} watchlist entries, over the ${MAX_WATCHLIST} cap`);
      }
    }

    // ---- report -------------------------------------------------------------

    console.log("Collections");
    for (const name of EXPECTED) {
      const n = counts[name];
      console.log(`  ${n === null ? "MISSING" : String(n).padStart(6)}  ${name}`);
    }
    console.log("");
    console.log(`Members: ${memberRows.length}`);

    console.log("");
    render(errors, "ERRORS");
    if (warnings.length) console.log("");
    render(warnings, "WARNINGS");

    console.log("");
    if (!errors.length && !warnings.length) {
      console.log("Every check passed: rows are well-formed and point at things that exist.");
      return;
    }
    if (!errors.length) {
      console.log("No errors. The warnings above are survivable but worth reading.");
      return;
    }
    console.log(`${errors.length} problem(s) found.`);
    if (STRICT) process.exitCode = 1;
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
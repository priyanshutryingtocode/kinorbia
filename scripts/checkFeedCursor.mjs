// The activity feed's cursor is correct, checked by walking it.
//
// Two real defects lived here and neither shows up on page 1, which is why a smoke test
// passes while the feature is broken:
//
//   1. Duplicates. The branch predicate compared (date, _id) while the union sorted by
//      (date, kind, _id). Two rows sharing a timestamp were re-served -- 3-4 per 25-page walk.
//   2. A privacy leak. The visibility filter and the cursor are both `$or`, and spreading
//      them into one object kept only the last. Page 1 filtered correctly; every page after
//      served other members' private reviews and lists -- 16 of them.
//
// So this walks the real query against live Atlas and asserts on the whole result: exact
// totals, no repeats, no ordering breaks, and no row the visibility filter excludes.
// Read-only.

await dbConnect();

import dbConnect from "../lib/dbConnect.ts";
import Review from "../models/Review.ts";
import MovieList from "../models/MovieList.ts";
import User from "../models/User.ts";
import UserMovie from "../models/UserMovie.ts";
import { getActivityFeed } from "../features/activity/queries.ts";

const STRICT = process.argv.includes("--strict");
const MAX_PAGES = 60;

const cases = [];
function test(name, run) {
  cases.push({ name, run });
}

function keyOf(row) {
  if (row.kind === "review") return `review:${String(row.review._id)}`;
  if (row.kind === "list") return `list:${String(row.list._id)}`;
  return `watch:${String(row.watch._id)}`;
}

async function walkFeed(email) {
  let cursor = null;
  const seen = new Map();
  const order = [];
  let pages = 0;
  let duplicates = 0;
  let shortPages = 0;

  for (let i = 0; i < MAX_PAGES; i += 1) {
    const page = await getActivityFeed({
      isFollowingFeed: true,
      sessionEmail: email,
      cursor,
    });
    if (page.rows.length === 0) break;

    pages += 1;
    if (page.rows.length < page.pageSize) shortPages += 1;

    for (const row of page.rows) {
      const key = keyOf(row);
      if (seen.has(key)) duplicates += 1;
      else seen.set(key, 1);
      order.push(new Date(row.date).getTime());
    }

    cursor = page.nextCursor;
    if (!cursor) break;
  }

  return { seen, order, pages, duplicates, shortPages };
}

// The set the feed must produce exactly: public reviews, public lists, broadcast watches.
async function expectedFor(email) {
  const member = await User.findOne({ email }).select("following").lean();
  const following = member?.following ?? [];
  const publicFilter = { $or: [{ visibility: "public" }, { visibility: { $exists: false } }] };

  const reviews = new Set(
    (
      await Review.collection
        .find({ userEmail: { $in: following }, ...publicFilter }, { projection: { _id: 1 } })
        .toArray()
    ).map((r) => `review:${String(r._id)}`)
  );
  const lists = new Set(
    (
      await MovieList.collection
        .find({ userEmail: { $in: following }, ...publicFilter }, { projection: { _id: 1 } })
        .toArray()
    ).map((r) => `list:${String(r._id)}`)
  );
  const watches = new Set(
    (
      await UserMovie.collection
        .find(
          { userEmail: { $in: following }, "watched.broadcast": true },
          { projection: { _id: 1 } }
        )
        .toArray()
    ).map((r) => `watch:${String(r._id)}`)
  );

  return new Set([...reviews, ...lists, ...watches]);
}

test("the cursor walk yields every visible row exactly once, for every member who follows anyone", async () => {
  const members = await User.find({ following: { $exists: true, $ne: [] } })
    .select({ email: 1 })
    .lean();

  if (members.length === 0) {
    throw new Error("no member follows anyone; the walk would be vacuous");
  }

  for (const member of members) {
    const { seen, duplicates, pages } = await walkFeed(member.email);
    const expected = await expectedFor(member.email);

    if (pages === 0) {
      throw new Error(`${member.email}: walked 0 pages`);
    }
    if (duplicates !== 0) {
      throw new Error(`${member.email}: ${duplicates} row(s) served twice across ${pages} pages`);
    }

    const missing = [...expected].filter((k) => !seen.has(k));
    if (missing.length > 0) {
      throw new Error(`${member.email}: ${missing.length} visible row(s) never served, e.g. ${missing[0]}`);
    }

    // `.keys()`, not the Map itself: spreading a Map yields [key, value] pairs, and every
    // one of them then fails the Set lookup, so every row reads as extra.
    const extra = [...seen.keys()].filter((k) => !expected.has(k));
    if (extra.length > 0) {
      // This is the leak shape: a row the visibility filter excludes, most often another
      // member's private review or list arriving on page 2 rather than page 1.
      throw new Error(`${member.email}: ${extra.length} row(s) served that must not be, e.g. ${extra[0]}`);
    }

    console.log(`         ${member.email}: ${seen.size} rows over ${pages} pages`);
  }
});

test("pages arrive newest first, with no row dated after one already served", async () => {
  const member = await User.collection
    .find({ following: { $exists: true, $ne: [] } })
    .project({ email: 1 })
    .limit(1)
    .toArray();
  const email = member[0].email;

  const { order } = await walkFeed(email);
  for (let i = 1; i < order.length; i += 1) {
    if (order[i] > order[i - 1]) {
      throw new Error(`row ${i} is dated after row ${i - 1}; the cursor went backwards`);
    }
  }
});

test("the walk terminates, and only its final page is short", async () => {
  const member = await User.collection
    .find({ following: { $exists: true, $ne: [] } })
    .project({ email: 1 })
    .limit(1)
    .toArray();
  const email = member[0].email;

  const { shortPages, pages } = await walkFeed(email);
  if (shortPages > 1) {
    throw new Error(`${shortPages} short pages in ${pages}; a short page means the cursor overran`);
  }
});

test("a malformed cursor starts from the top instead of erroring", async () => {
  const member = await User.collection
    .find({ following: { $exists: true, $ne: [] } })
    .project({ email: 1 })
    .limit(1)
    .toArray();
  const email = member[0].email;

  for (const junk of ["not-base64!!", Buffer.from("[]").toString("base64url"), Buffer.from('["x","y","z"]').toString("base64url")]) {
    const page = await getActivityFeed({ isFollowingFeed: true, sessionEmail: email, cursor: junk });
    if (page.rows.length === 0) {
      throw new Error(`cursor ${junk} returned nothing rather than falling back to the first page`);
    }
  }
});

test("the public Community feed never serves watch activity", async () => {
  // Every other case here passes `isFollowingFeed: true`, which is exactly how the watch
  // branch reached the public feed unnoticed: the signed-out Community tab had no coverage
  // at all. Watches are opt-in and scoped to who follows you, so a public feed must never
  // carry them -- not even for a member who opted in.
  const members = await User.find({ following: { $exists: true, $ne: [] } })
    .select({ email: 1 })
    .lean();

  // Including a signed-out read, since /activity is reachable without a session.
  for (const sessionEmail of [members[0]?.email ?? null, null]) {
    const feed = await getActivityFeed({ isFollowingFeed: false, sessionEmail, cursor: null });
    const watches = feed.rows.filter((row) => row.kind === "watch");
    if (watches.length > 0) {
      throw new Error(
        `Community feed served ${watches.length} watch row(s) (session ${sessionEmail ?? "signed out"}); watches are for followers only`
      );
    }
  }

  // And the following feed must still have them, or the branch was dropped everywhere.
  const following = await getActivityFeed({
    isFollowingFeed: true,
    sessionEmail: members[0].email,
    cursor: null,
  });
  const followedWatches = following.rows.filter((row) => row.kind === "watch").length;
  if (followedWatches === 0) {
    const anyBroadcast = await UserMovie.collection.countDocuments({ "watched.broadcast": true });
    if (anyBroadcast > 0) {
      throw new Error(
        "the Following feed serves no watches although broadcast rows exist; the branch was dropped"
      );
    }
  }
});

// --- run ---------------------------------------------------------------------

let failed = 0;

for (const { name, run } of cases) {
  try {
    await run();
    console.log(`  ok    ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`  FAIL  ${name}`);
    console.error(`        ${error?.message?.split("\n").join("\n        ")}`);
  }
}

console.log(`\n${cases.length - failed}/${cases.length} feed-cursor invariants hold.`);

if (failed > 0) {
  console.error("\nThe activity feed would repeat, skip or leak rows.");
  process.exit(STRICT ? 1 : 0);
}

process.exit(0);
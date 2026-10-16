// Every value crossing a Server -> Client boundary is serialisable.
//
// This exists because of a defect that tsc, lint and `next build` all passed: the activity
// feed handed raw Mongo documents to a client component, and every row carried two BSON
// ObjectIds (_id and sortId). React refuses to serialise an object with a toJSON method, so
// the feed failed at RENDER time -- the only kind of failure none of the existing gates can
// see, because by the time it happens the code is already "type correct".
//
//   data: row.review as unknown as Record<string, unknown>
//
// That double cast is the whole trick: it forces the value into precisely the type React
// rejects, so the compiler never gets a chance to disagree.
//
// So this walks the real values, against live Atlas, and asserts each is a primitive, a
// plain array, or a plain object -- the rule React actually applies. `serializeFeedRow` is
// what makes the feed pass; if a future field is added to it without being serialised, this
// fails.
//
// Read-only.

import { readFileSync } from "node:fs";
import dbConnect from "../lib/dbConnect.ts";
import { getActivityFeed } from "../features/activity/queries.ts";
import { serializeFeedRows } from "../features/activity/serializers.ts";
import { getCommentThread } from "../features/comments/queries.ts";
import { getFavoritePage, getListPage, getReviewPage } from "../features/profile/queries.ts";
import { listUserMedia } from "../features/media/userMovie.ts";
import { fetchMovies, fetchTrending } from "../app/actions.ts";

const STRICT = process.argv.includes("--strict");

// The depth cap is not arbitrary paranoia: a cyclic driver object would otherwise recurse
// forever. Nothing in a feed row is that deep, so tripping it means something unexpected.
const MAX_DEPTH = 8;

function findUnsupported(value, path = "", found = [], depth = 0) {
  if (depth > MAX_DEPTH) {
    found.push(`${path || "<root>"} -> deeper than ${MAX_DEPTH} levels`);
    return found;
  }
  if (value === null || typeof value !== "object") return found;

  // Date is the one class instance React tolerates, so it is allowed through deliberately.
  if (value instanceof Date) return found;

  if (Array.isArray(value)) {
    value.forEach((entry, index) => findUnsupported(entry, `${path}[${index}]`, found, depth + 1));
    return found;
  }

  const name = value.constructor?.name;
  if (name !== "Object") {
    const why = typeof value.toJSON === "function" ? "has toJSON, React rejects it" : "class instance";
    found.push(`${path || "<root>"} -> ${name} (${why})`);
    return found; // do not descend into something already rejected
  }

  for (const [key, entry] of Object.entries(value)) {
    findUnsupported(entry, path ? `${path}.${key}` : key, found, depth + 1);
  }
  return found;
}

const cases = [];
function test(name, run) {
  cases.push({ name, run });
}

// Asserts a value is safe to hand to a client component.
function assertSerializable(label, value) {
  const found = [...new Set(findUnsupported(value))];
  if (found.length > 0) {
    throw new Error(
      `${label} carries values React cannot serialise:\n  ${found.slice(0, 5).join("\n  ")}`
    );
  }
}

// The two places a feed row becomes a client prop: the page's server render, and the server
// action the client calls to append pages. Both must go through the serializer.
const FEED_CALL_SITES = ["app/(root)/activity/page.tsx", "app/(root)/activity/actions.ts"];

// The cast that caused all of this. A double `as unknown as` is what forces a Mongo document
// into Record<string, unknown>, which is precisely the shape React rejects -- so its presence
// anywhere in server code means a value can be made to cross unchecked.
const BYPASS_CAST = /as unknown as Record<string, unknown>/;

// --- cases ------------------------------------------------------------------

test("feed rows are serialisable after serialization", async () => {
  const feed = await getActivityFeed({ isFollowingFeed: false, sessionEmail: null, cursor: null });
  assertSerializable("seed rows", serializeFeedRows(feed.rows));
  assertSerializable("usernames", feed.usernames);
  assertSerializable("names", feed.names);
  assertSerializable("ratingMaps", feed.ratingMaps);
});

test("no raw feed row leaks to the client", async () => {
  // The regression itself: the unserialized rows are exactly what used to be passed as
  // props. Asserting the source is still unsafe keeps this check honest -- if the rows ever
  // became plain by themselves, the guard would silently pass while the serializer stopped
  // being load-bearing.
  const feed = await getActivityFeed({ isFollowingFeed: false, sessionEmail: null, cursor: null });
  const found = [...new Set(findUnsupported(feed.rows))];
  if (found.length === 0) {
    throw new Error(
      "the raw feed rows are already plain, so serializeFeedRow is untested by this run. " +
        "The serializer's correctness is no longer being proven."
    );
  }
});

test("every feed kind is covered by the serializer", async () => {
  // A kind the serializer does not know about would fall through its final branch and be
  // written as a watch. This asserts the output's discriminants match the input's.
  const feed = await getActivityFeed({ isFollowingFeed: false, sessionEmail: null, cursor: null });
  const serialized = serializeFeedRows(feed.rows);
  if (serialized.length !== feed.rows.length) {
    throw new Error(`serializer returned ${serialized.length} rows for ${feed.rows.length} inputs`);
  }
  feed.rows.forEach((row, index) => {
    if (serialized[index].kind !== row.kind) {
      throw new Error(
        `row ${index} came back as "${serialized[index].kind}" but was a "${row.kind}"`
      );
    }
  });
});

test("every serialized feed row carries a parseable timestamp", async () => {
  // This is the invariant that was missing when the serializer first shipped.
  //
  // The feed's $project stages alias each source's timestamp into `date` and, being
  // inclusion projections, do NOT keep the branch's own field. A serializer that read
  // `review.createdAt` therefore got undefined, emitted "", and ActivityRow's strOr returned
  // that empty string as-is (it is typeof "string") instead of falling back to `date` --
  // so `new Date("")` was an Invalid Date and toISOString threw, crashing the whole feed.
  //
  // "" is perfectly serialisable, so the serialisation invariants above could not see it.
  // This one checks validity instead: a timestamp the client cannot parse is a bug whether
  // or not it survives the wire.
  const feed = await getActivityFeed({ isFollowingFeed: false, sessionEmail: null, cursor: null });
  const serialized = serializeFeedRows(feed.rows);
  const problems = [];

  for (const [index, row] of serialized.entries()) {
    // The outer `date` and the branch-specific key the client actually reads must both
    // parse. ActivityRow does `new Date(strOr(data[key], date))`, so an unparseable value in
    // either position breaks the render.
    const key = row.kind === "watch" ? "watchedAt" : "createdAt";
    for (const [label, value] of [["date", row.date], [key, row.data[key]]]) {
      if (typeof value !== "string" || Number.isNaN(new Date(value).getTime())) {
        problems.push(`row ${index} (${row.kind}): ${label} is not a parseable date -> ${JSON.stringify(value)}`);
      }
    }
  }

  if (problems.length > 0) {
    throw new Error(
      `${problems.length} feed timestamp(s) would render as Invalid Date:\n  ${problems.slice(0, 5).join("\n  ")}`
    );
  }
});

test("no code bypasses the serializer on the way to a client", () => {
  // The runtime cases above prove serializeFeedRow produces plain values. They do NOT prove
  // anything calls it -- a page that passed the raw document instead would sail through
  // every other test here, which is exactly what the reintroduced-defect run showed. So this
  // closes the loop from the other side: the call sites must route through the serializer and
  // must not contain the cast that made the original bug invisible to tsc.
  const problems = [];

  for (const file of FEED_CALL_SITES) {
    const source = readFileSync(file, "utf8");
    if (!source.includes("serializeFeedRows")) {
      problems.push(`${file} does not call serializeFeedRows`);
    }
    if (BYPASS_CAST.test(source)) {
      problems.push(`${file} casts a value with "as unknown as Record<string, unknown>"`);
    }
  }

  if (problems.length > 0) {
    throw new Error(
      `a feed row can reach a Client Component unserialised:\n  ${problems.join("\n  ")}`
    );
  }
});

test("comment threads are serialisable", async () => {
  const feed = await getActivityFeed({ isFollowingFeed: false, sessionEmail: null, cursor: null });
  const review = feed.rows.find((row) => row.kind === "review");
  if (!review) return; // no review to hang a thread off; not a failure
  assertSerializable(
    "comments",
    await getCommentThread({ parentType: "review", parentId: String(review.review._id) })
  );
});

test("profile shelf pages are serialisable", async () => {
  assertSerializable("favorites", (await getFavoritePage("demo1@kinorbia.dev", 1)).items);
  assertSerializable("reviews", (await getReviewPage("demo1@kinorbia.dev", 1)).items);
  assertSerializable("lists", (await getListPage("demo1@kinorbia.dev", 1)).items);
});

test("media rows are serialisable", async () => {
  const favorites = await listUserMedia("demo1@kinorbia.dev", "favorite", { limit: 20 });
  assertSerializable("favorites", favorites.rows);
});

test("TMDB-backed grids are serialisable", async () => {
  assertSerializable("browse grid", (await fetchMovies({ page: 1 })).results);
  assertSerializable("trending grid", (await fetchTrending({ page: 1 })).results);
});

// --- run --------------------------------------------------------------------

await dbConnect();

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

console.log(`\n${cases.length - failed}/${cases.length} serialization invariants hold.`);

if (failed > 0) {
  console.error("\nSomething non-plain is crossing into a Client Component.");
  process.exit(STRICT ? 1 : 0);
}

process.exit(0);
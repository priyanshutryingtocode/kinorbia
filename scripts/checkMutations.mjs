import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Requires the resolver hook: `npm run check:mutations` passes `--import ./scripts/registerTs.mjs`,
// without which feature modules cannot be loaded outside Next.
//
// Assertions run against live Atlas inside a transaction that is then ABORTED: mutate,
// assert, let the abort discard everything.
//
// Covers the mutations that carry real logic -- where the shape of the query matters.

const FEATURES_DIR = new URL("../features/", import.meta.url);

// --- source invariants ----------------------------------------------------------

// A `mutations.ts` reaching back into app/ or components/ makes the seam cosmetic.
for (const feature of readdirSync(FEATURES_DIR)) {
  const mutationsPath = join(FEATURES_DIR.pathname, feature, "mutations.ts");
  let source;
  try {
    source = readFileSync(mutationsPath, "utf8");
  } catch {
    continue;
  }

  assert.ok(
    !/from "@\/app\//.test(source),
    `features/${feature}/mutations.ts must not import from app/`
  );
  assert.ok(
    !/from "@\/components\//.test(source),
    `features/${feature}/mutations.ts must not import from components/`
  );

  // `.lean({ session })` compiles and silently reads outside the transaction, so the
  // shape is banned outright. Bind with `.session(s)`.
  assert.ok(
    !/\.lean(<[^>]*>)?\(\s*(opts|\{[^}]*session)/.test(source),
    `features/${feature}/mutations.ts must bind a transaction with .session(s), not .lean({ session }). ` +
      "Found: " + (source.match(/\.lean(<[^>]*>)?\(\s*(opts|\{[^}]*session)/) || [""])[0]
  );

  // Model.create(doc, options) reads the second argument as a second document to
  // insert. Only the array form accepts options.
  assert.ok(
    !/\.create\(\s*\{/.test(source),
    `features/${feature}/mutations.ts must call Model.create([doc], opts), not Model.create(doc, opts)`
  );
}

// --- fixtures -------------------------------------------------------------------

const mongoose = (await import("mongoose")).default;
const uri = process.env.MONGO_MONGODB_URI || process.env.MONGODB_URI;
assert.ok(uri, "MONGO_MONGODB_URI or MONGODB_URI must be set");

// Connect the way the app does, so the harness inherits dbConnect's retry. The SRV
// fails intermittently (measured ~13% ESERVFAIL/EREFUSED), and a gate that fails on
// infrastructure noise stops being run at all.
const { default: dbConnect } = await import("../lib/dbConnect.ts");
await dbConnect();
const db = mongoose.connection.db;

const PROBE_EMAIL = "__check_mutations_probe__";
const ROLLBACK_PROBE = "__check_rollback_probe__";
const PROBE_MOVIE_ID = "999000111";

// A previously interrupted run leaves probe rows behind (see inTransaction below).
// Clearing them first means a rerun starts from a known state instead of inheriting
// another run's fixtures, which is what made an early failure surface as a
// misleading one several lines away.
async function purgeProbeRows() {
  const identities = [
    PROBE_EMAIL,
    "__check_mutations_owner__",
    "__check_mutations_follow_target__",
  ];
  for (const collection of ["users", "notifications", "reviews", "usermovies"]) {
    for (const identity of identities) {
      await db.collection(collection).deleteMany({ userEmail: identity });
      await db.collection(collection).deleteMany({ email: identity });
      await db.collection(collection).deleteMany({ actorEmail: identity });
    }
  }
}
await purgeProbeRows();

// The abort has to be in a finally, not after the work. An assertion that throws
// mid-transaction would otherwise skip it, and session.endSession() does NOT abort a
// transaction -- it only ends the session. The server then holds the transaction open
// until a timeout, and its rows stay readable, so the next run sees another run's
// probe data and fails in a way that points at the wrong line.
async function inTransaction(work) {
  const session = await mongoose.startSession();
  try {
    await session.startTransaction();
    return await work(session);
  } finally {
    await session.abortTransaction().catch(() => {});
    await session.endSession();
  }
}

// A minimal account for the mutation under test to read and write.
//
// No media arrays: they were dropped in favour of `usermovies`, so a probe that seeded them
// would be asserting against fields nothing reads. Every invariant here reaches the rows.
async function seedUser(session) {
  await db.collection("users").insertOne(
    {
      name: "Probe",
      email: PROBE_EMAIL,
      username: "check-mutations-probe",
      following: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    { session }
  );
}

const results = [];

function record(name, detail) {
  results.push({ name, detail });
  console.log(`  PASS  ${name}`);
  if (detail) console.log(`        ${detail}`);
}

// --- markNotificationsRead ------------------------------------------------------
// Two branches, and the difference matters: a specific id must only mark that one
// row, while a missing id must mark every unread row for the user and nothing else.

{
  const { markNotificationsRead } = await import("../features/social/mutations.ts");

  await inTransaction(async (session) => {
    const now = new Date();
    await db.collection("notifications").insertMany(
      [
        { userEmail: PROBE_EMAIL, type: "like", read: false, createdAt: now },
        { userEmail: PROBE_EMAIL, type: "save", read: false, createdAt: now },
        { userEmail: "__someone_else__", type: "like", read: false, createdAt: now },
      ],
      { session }
    );

    // Branch 1: a valid id marks only that row.
    const first = await db.collection("notifications").findOne({ userEmail: PROBE_EMAIL }, { session });
    const result = await markNotificationsRead(PROBE_EMAIL, first._id.toString(), { session });
    const mine = await db.collection("notifications").find({ userEmail: PROBE_EMAIL }, { session }).toArray();
    const theirs = await db.collection("notifications").findOne({ userEmail: "__someone_else__" }, { session });

    assert.equal(result, 1, "one row should be marked");
    assert.equal(mine.filter((n) => n.read === true).length, 1, "exactly one own row marked");
    assert.equal(theirs.read, false, "another user's notification untouched");

    // Branch 2: no id marks all of this user's unread rows, and nobody else's.
    await db.collection("notifications").updateMany({}, { $set: { read: false } }, { session });
    const all = await markNotificationsRead(PROBE_EMAIL, undefined, { session });
    const mineAfter = await db.collection("notifications").find({ userEmail: PROBE_EMAIL }, { session }).toArray();
    const theirsAfter = await db.collection("notifications").findOne({ userEmail: "__someone_else__" }, { session });

    assert.equal(all, 2, "both own rows should be marked");
    assert.ok(mineAfter.every((n) => n.read === true), "all own rows read");
    assert.equal(theirsAfter.read, false, "another user's notification still untouched");

    record("markNotificationsRead: scoped to the caller in both branches");
  });
}

// --- markWatched ----------------------------------------------------------------
// Idempotence: marking an already-watched title must not move `watchedAt`, and must not
// create a second row under the unique (userEmail, movieId, mediaType) index.

{
  const { markWatched } = await import("../features/journal/mutations.ts");
  const { listWatchHistory, listWatchDays } = await import("../features/media/userMovie.ts");

  await inTransaction(async (session) => {
    const snapshot = { movieId: PROBE_MOVIE_ID, mediaType: "movie", movieTitle: "Probe Title", posterPath: null };
    await markWatched({ userEmail: PROBE_EMAIL, ...snapshot }, { session });

    const created = await db.collection("usermovies").findOne(
      { userEmail: PROBE_EMAIL, movieId: PROBE_MOVIE_ID },
      { session }
    );
    assert.ok(created, "row written");
    assert.equal(created.title, "Probe Title", "stored field is `title`, not the wire name `movieTitle`");
    assert.ok(created.watched.watchedAt, "watched.watchedAt set");

    const originalWatchedAt = created.watched.watchedAt.getTime();

    await markWatched({ userEmail: PROBE_EMAIL, ...snapshot }, { session });
    const after = await db.collection("usermovies").findOne(
      { userEmail: PROBE_EMAIL, movieId: PROBE_MOVIE_ID },
      { session }
    );
    const count = await db.collection("usermovies").countDocuments(
      { userEmail: PROBE_EMAIL, movieId: PROBE_MOVIE_ID },
      { session }
    );

    assert.equal(count, 1, "re-marking must not create a duplicate row");
    assert.equal(after.watched.watchedAt.getTime(), originalWatchedAt, "re-marking must not move watchedAt");

    record("markWatched: idempotent on one row, watchedAt is first-write-wins");
  });

  // The read path the profile grid, the streaks and the insights all use.
  await inTransaction(async (session) => {
    await seedUser(session);
    await markWatched(
      { userEmail: PROBE_EMAIL, movieId: "555000333", mediaType: "movie", movieTitle: "Watched One", posterPath: null },
      { session }
    );
    await markWatched(
      { userEmail: PROBE_EMAIL, movieId: "555000334", mediaType: "tv", movieTitle: "Watched Two", posterPath: null },
      { session }
    );

    const history = await listWatchHistory(PROBE_EMAIL, { session });
    assert.equal(history.length, 2, "history returns both watches");
    assert.deepEqual(
      history.map((r) => r.title).sort(),
      ["Watched One", "Watched Two"],
      "titles read back"
    );
    assert.ok(history.every((r) => r.watchedAt instanceof Date), "watchedAt is a Date");

    // Two marks milliseconds apart, so distinct returns two timestamps. Collapsing to days
    // is buildWatchStreaks' job, not this.
    const days = await listWatchDays(PROBE_EMAIL, session);
    assert.equal(days.length, 2, "both watch timestamps come back");
    assert.ok(days.every((d) => d instanceof Date), "and they are Dates, not strings");
    assert.deepEqual(
      [new Set(days.map((d) => d.toISOString().slice(0, 10))).size],
      [1],
      "both fall on the same UTC day, which is what the streak counts"
    );

    record("markWatched: reaches listWatchHistory and listWatchDays");
  });
}

// --- issueVerifyToken / consumeVerifyToken -------------------------------------
// The token lifecycle is the security surface of these routes, and the branch that
// matters most is the one that must NOT do anything: an expired link.

{
  const { issueVerifyToken, consumeVerifyToken } = await import("../features/auth/mutations.ts");

  await inTransaction(async (session) => {
    await seedUser(session);

    const issued = await issueVerifyToken(PROBE_EMAIL, { session });
    assert.equal(issued.outcome, "issued", "first issue mints a token");

    const stored = await db.collection("users").findOne({ email: PROBE_EMAIL }, { session });
    assert.ok(stored.verifyToken?.token, "token hash stored");
    assert.notEqual(stored.verifyToken.token, issued.token, "the raw token is NOT what is stored");
    assert.ok(stored.verifyToken.expiresAt > new Date(), "expiry is in the future");

    // A live token must not be re-issued: that would create two working links.
    const again = await issueVerifyToken(PROBE_EMAIL, { session });
    assert.equal(again.outcome, "already-pending", "live token suppresses a re-send");

    // Consuming the live link verifies.
    const consumed = await consumeVerifyToken(issued.token, { session });
    assert.equal(consumed, "verified", "live link verifies");
    const verified = await db.collection("users").findOne({ email: PROBE_EMAIL }, { session });
    assert.ok(verified.emailVerified, "emailVerified set");
    assert.equal(verified.verifyToken, undefined, "token cleared after use");

    // The same link a second time must not re-arm anything.
    const replayed = await consumeVerifyToken(issued.token, { session });
    assert.equal(replayed, "invalid", "a spent token is invalid");

    record("issueVerifyToken: hashes at rest, no re-send while live");
    record("consumeVerifyToken: verifies once, then refuses the replay");
  });

  // An expired link must not verify. This is the branch that silently rots if the
  // expiry check is ever hoisted or dropped during a move.
  await inTransaction(async (session) => {
    await seedUser(session);
    const { hashToken } = await import("../lib/token.ts");
    await db.collection("users").updateOne(
      { email: PROBE_EMAIL },
      { $set: { verifyToken: { token: hashToken("expired-token-value"), expiresAt: new Date(Date.now() - 60_000) } } },
      { session }
    );

    const outcome = await consumeVerifyToken("expired-token-value", { session });
    const user = await db.collection("users").findOne({ email: PROBE_EMAIL }, { session });

    assert.equal(outcome, "invalid", "an expired link must not verify");
    assert.equal(user.emailVerified ?? null, null, "emailVerified untouched by an expired link");
    record("consumeVerifyToken: an expired link verifies nothing");
  });
}

// --- consumeResetToken ---------------------------------------------------------
// Sets the password, marks the address verified, and invalidates every session
// issued before now. The last part is the reason a stolen cookie does not outlive
// a password change.

{
  const { consumeResetToken } = await import("../features/auth/mutations.ts");
  const { hashToken } = await import("../lib/token.ts");

  await inTransaction(async (session) => {
    await seedUser(session);
    await db.collection("users").updateOne(
      { email: PROBE_EMAIL },
      { $set: { resetToken: { token: hashToken("live-reset"), expiresAt: new Date(Date.now() + 60_000) } } },
      { session }
    );

    const outcome = await consumeResetToken("live-reset", "hashed-password-value", { session });
    assert.equal(outcome, "reset", "live reset link redeems");

    const user = await db.collection("users").findOne({ email: PROBE_EMAIL }, { session });
    assert.equal(user.password, "hashed-password-value", "password replaced");
    assert.ok(user.emailVerified, "redeeming doubles as verification");
    assert.ok(user.sessionsInvalidBefore, "sessions issued before now are invalidated");
    assert.equal(user.resetToken, undefined, "token cleared, so a forwarded link is dead");

    const replay = await consumeResetToken("live-reset", "second-attempt", { session });
    assert.equal(replay, "invalid", "the same reset link cannot be redeemed twice");

    record("consumeResetToken: sets password, verifies, revokes sessions, single-use");
  });

  await inTransaction(async (session) => {
    await seedUser(session);
    await db.collection("users").updateOne(
      { email: PROBE_EMAIL },
      { $set: { resetToken: { token: hashToken("dead-reset"), expiresAt: new Date(Date.now() - 60_000) } } },
      { session }
    );

    const outcome = await consumeResetToken("dead-reset", "hashed-password-value", { session });
    const user = await db.collection("users").findOne({ email: PROBE_EMAIL }, { session });

    assert.equal(outcome, "invalid", "an expired reset link is refused");
    assert.equal(user.password, undefined, "password untouched");
    assert.equal(user.sessionsInvalidBefore ?? null, null, "no session revocation on a dead link");
    record("consumeResetToken: an expired link changes nothing");
  });
}

// --- applySocialToggle ---------------------------------------------------------
// Add-first toggle. The property that matters: the update that WINS decides whether a
// notification is created or removed, so a re-toggle cannot leave one orphaned.

{
  const { applySocialToggle } = await import("../features/social/mutations.ts");
  const OWNER = "__check_mutations_owner__";

  await inTransaction(async (session) => {
    await db.collection("users").insertOne(
      {
        name: "Owner",
        email: OWNER,
        username: "owner",
        favorites: [],
        watchlist: [],
        following: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      { session }
    );
    await db.collection("reviews").insertOne(
      {
        userEmail: OWNER,
        userName: "Owner",
        title: "R",
        movieId: "1",
        mediaType: "movie",
        body: "b",
        visibility: "public",
        createdAt: new Date(),
      },
      { session }
    );
    const review = await db.collection("reviews").findOne({ userEmail: OWNER }, { session });

    const liked = await applySocialToggle({
      actorEmail: PROBE_EMAIL,
      actorName: "Probe",
      targetId: review._id.toString(),
      targetType: "review",
      action: "like",
      },
      { session }
      );
    assert.equal(liked, false, "first like leaves the action unset");

    const withLike = await db.collection("reviews").findOne({ _id: review._id }, { session });
    assert.deepEqual(withLike.likedBy, [PROBE_EMAIL], "actor added to likedBy");

    const notif = await db.collection("notifications").findOne(
      { userEmail: OWNER, actorEmail: PROBE_EMAIL },
      { session }
    );
    assert.ok(notif, "owner notified");
    assert.equal(notif.type, "like", "notification type matches the action");

    // Un-liking must remove the notification, not leave it orphaned.
    const unliked = await applySocialToggle({
      actorEmail: PROBE_EMAIL,
      actorName: "Probe",
      targetId: review._id.toString(),
      targetType: "review",
      action: "like",
      },
      { session }
      );
    assert.equal(unliked, true, "second toggle removes");

    const after = await db.collection("reviews").findOne({ _id: review._id }, { session });
    assert.deepEqual(after.likedBy, [], "likedBy cleared");
    const gone = await db.collection("notifications").countDocuments(
      { userEmail: OWNER, actorEmail: PROBE_EMAIL },
      { session }
    );
    assert.equal(gone, 0, "notification cleaned up, none orphaned");

    // A save on the same document must not disturb likedBy.
    await applySocialToggle({
      actorEmail: PROBE_EMAIL,
      actorName: "Probe",
      targetId: review._id.toString(),
      targetType: "review",
      action: "save",
    },
    { session }
    );
    const saved = await db.collection("reviews").findOne({ _id: review._id }, { session });
    assert.deepEqual(saved.likedBy, [], "like state untouched by a save");
    assert.deepEqual(saved.savedBy, [PROBE_EMAIL], "savedBy set independently");

    record("applySocialToggle: like/unlike keeps notification in step, save is independent");
  });

  // Self-action must never notify.
  await inTransaction(async (session) => {
    await db.collection("users").insertOne(
      {
        name: "Self",
        email: PROBE_EMAIL,
        username: "probe2",
        favorites: [],
        watchlist: [],
        following: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      { session }
    );
    await db.collection("reviews").insertOne(
      {
        userEmail: PROBE_EMAIL,
        userName: "Self",
        title: "R2",
        movieId: "2",
        mediaType: "movie",
        body: "b",
        visibility: "public",
        createdAt: new Date(),
      },
      { session }
    );
    const review = await db.collection("reviews").findOne({ userEmail: PROBE_EMAIL }, { session });

    await applySocialToggle({
      actorEmail: PROBE_EMAIL,
      actorName: "Self",
      targetId: review._id.toString(),
      targetType: "review",
      action: "like",
      },
      { session }
      );
    const selfNotifs = await db.collection("notifications").countDocuments(
      { userEmail: PROBE_EMAIL },
      { session }
    );
    assert.equal(selfNotifs, 0, "no self-notification");

    record("applySocialToggle: never notifies the actor of their own action");
  });
}

// --- applyFollow ---------------------------------------------------------------
// The notification and the following edge move together, and the two operations are
// not symmetric: a follow notifies, an unfollow cleans up.

{
  const { applyFollow } = await import("../features/profile/mutations.ts");
  const TARGET = "__check_mutations_follow_target__";

  await inTransaction(async (session) => {
    await db.collection("users").insertOne(
      {
        name: "Actor",
        email: PROBE_EMAIL,
        username: "actor",
        favorites: [],
        watchlist: [],
        following: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      { session }
    );
    await db.collection("users").insertOne(
      {
        name: "Target",
        email: TARGET,
        username: "target",
        favorites: [],
        watchlist: [],
        following: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      { session }
    );
    const target = await db.collection("users").findOne({ email: TARGET }, { session });

    const followed = await applyFollow({
      actorEmail: PROBE_EMAIL,
      actorName: "Actor",
      targetUserId: target._id.toString(),
      operation: "follow",
    },
    { session }
    );
    assert.equal(followed.outcome, "changed", "follow applies");
    assert.equal(followed.targetUsername, "target", "target username returned for revalidation");

    const actor = await db.collection("users").findOne({ email: PROBE_EMAIL }, { session });
    assert.deepEqual(actor.following, [TARGET], "following edge added");
    const notif = await db.collection("notifications").countDocuments(
      { userEmail: TARGET, type: "follow" },
      { session }
    );
    assert.equal(notif, 1, "target notified");

    // Following again changes nothing and must not duplicate the notification.
    const again = await applyFollow({
      actorEmail: PROBE_EMAIL,
      actorName: "Actor",
      targetUserId: target._id.toString(),
      operation: "follow",
    },
    { session }
    );
    assert.equal(again.outcome, "unchanged", "repeat follow is a no-op");
    const dupes = await db.collection("notifications").countDocuments(
      { userEmail: TARGET, type: "follow" },
      { session }
    );
    assert.equal(dupes, 1, "no duplicate follow notification");

    const unfollowed = await applyFollow({
      actorEmail: PROBE_EMAIL,
      actorName: "Actor",
      targetUserId: target._id.toString(),
      operation: "unfollow",
    },
    { session }
    );
    assert.equal(unfollowed.outcome, "changed", "unfollow applies");
    const actorAfter = await db.collection("users").findOne({ email: PROBE_EMAIL }, { session });
    assert.deepEqual(actorAfter.following, [], "edge removed");
    const cleaned = await db.collection("notifications").countDocuments(
      { userEmail: TARGET, type: "follow" },
      { session }
    );
    assert.equal(cleaned, 0, "follow notification removed");

    record("applyFollow: edge and notification move together, repeat is a no-op");
  });

  // Following yourself must be refused, not turned into a self-notification.
  await inTransaction(async (session) => {
    await db.collection("users").insertOne(
      {
        name: "Solo",
        email: PROBE_EMAIL,
        username: "solo",
        favorites: [],
        watchlist: [],
        following: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      { session }
    );
    const me = await db.collection("users").findOne({ email: PROBE_EMAIL }, { session });

    const outcome = await applyFollow({
      actorEmail: PROBE_EMAIL,
      actorName: "Solo",
      targetUserId: me._id.toString(),
      operation: "follow",
    },
    { session }
    );
    assert.equal(outcome.outcome, "no-target", "self-follow refused");

    record("applyFollow: a member cannot follow themselves");
  });
}

// --- UserMovie upsert semantics -------------------------------------------------
// The unique index is the whole point of the normalised model, so the properties that
// matter are: one row per key no matter how many writes, independent states on one
// document, and a rating that survives an unrelated write.

{
  const { addFavorite, markWatched, toggleMedia, getMediaStatus } = await import(
    "../features/media/userMovie.ts"
  );
  const MID = "555000111";

  await inTransaction(async (session) => {
    await seedUser(session);
    const snap = {
      movieId: MID,
      mediaType: "movie",
      title: "Probe Film",
      posterPath: "/p.jpg",
      voteAverage: 7.5,
      releaseDate: "2026-01-01",
      genreIds: [1, 2],
    };

    await addFavorite(PROBE_EMAIL, { ...snap, personalRating: 8 }, { session });
    await toggleMedia({ email: PROBE_EMAIL, state: "watchlist", snapshot: snap }, { session });
    await markWatched(PROBE_EMAIL, snap, { session });

    const um = await db.collection("usermovies").findOne(
      { userEmail: PROBE_EMAIL, movieId: MID },
      { session }
    );
    assert.ok(um, "one row created for the title");
    assert.equal(um.favorite.addedAt instanceof Date, true, "favorited");
    assert.ok(um.watchlist.addedAt, "watchlisted at the same time");
    assert.ok(um.watched.watchedAt, "watched at the same time");
    assert.equal(um.favorite.personalRating, 8, "rating stored");
    assert.deepEqual(um.genreIds, [1, 2], "genres stored");

    // A second favourite write must not create a second row.
    await addFavorite(PROBE_EMAIL, snap, { session });
    const dupes = await db
      .collection("usermovies")
      .countDocuments({ userEmail: PROBE_EMAIL, movieId: MID }, { session });
    assert.equal(dupes, 1, "repeat write still one row");

    record("UserMovie: favorited + watchlisted + watched coexist on one document");
    record("UserMovie: repeat writes never create a second row");

    // An unrelated write must not clobber the rating.
    await markWatched(PROBE_EMAIL, { ...snap, watchedAt: new Date() }, { session });
    const after = await db.collection("usermovies").findOne(
      { userEmail: PROBE_EMAIL, movieId: MID },
      { session }
    );
    assert.equal(after.favorite.personalRating, 8, "rating survives an unrelated write");

    // Unsetting one state leaves the others alone.
    await toggleMedia({ email: PROBE_EMAIL, state: "favorite", snapshot: { ...snap } }, { session });
    const remaining = await db.collection("usermovies").findOne(
      { userEmail: PROBE_EMAIL, movieId: MID },
      { session }
    );
    assert.equal(remaining.favorite, undefined, "favorite state removed");
    assert.ok(remaining.watchlist?.addedAt, "watchlist untouched by un-favouriting");
    assert.ok(remaining.watched?.watchedAt, "watched untouched by un-favouriting");

    record("UserMovie: un-favouriting keeps watchlist and watched intact");

    const status = await getMediaStatus(PROBE_EMAIL, { movieId: MID, mediaType: "movie" }, { session });
    assert.deepEqual(status, { isFavorite: false, personalRating: 0, isWatchlisted: true, isWatched: true });
    record("UserMovie: status reads back the three states independently");
  });

  // A title with no row at all is not an error, it is the empty status.
  await inTransaction(async (session) => {
    const absent = await getMediaStatus(PROBE_EMAIL, { movieId: "000", mediaType: "movie" }, { session });
    assert.deepEqual(absent, { isFavorite: false, personalRating: 0, isWatchlisted: false, isWatched: false });
    record("UserMovie: an unknown title reads as the empty status");
  });

  // The two projections used to run every row through one function, so a title on both
  // lists was ordered by its watchlist date but labelled with its favorite date, and the
  // watchlist page carried a `personalRating` the member never gave.
  {
    const { listUserMedia } = await import("../features/media/userMovie.ts");
    const { toFavoriteMovie, toWatchlistMovie } = await import("../lib/reviewRatings.ts");
    const BOTH = "555000222";
    const snap = {
      movieId: BOTH,
      mediaType: "movie",
      title: "Both Lists",
      posterPath: null,
      voteAverage: 5,
      releaseDate: null,
      genreIds: [],
    };

    await inTransaction(async (session) => {
      await seedUser(session);
      // Favorited first, so favorite.addedAt is strictly earlier than watchlist.addedAt.
      await addFavorite(PROBE_EMAIL, { ...snap, personalRating: 9, addedAt: new Date("2020-01-01") }, { session });
      // Backdated via the raw driver: toggleMedia takes no addedAt, and this needs the two
      // dates to differ to prove each view reports its own.
      await db.collection("usermovies").updateOne(
        { userEmail: PROBE_EMAIL, movieId: BOTH },
        { $set: { "watchlist.addedAt": new Date("2026-01-01") } },
        { session }
      );

      const [asFavorite, asWatchlist] = await Promise.all([
        listUserMedia(PROBE_EMAIL, "favorite", { session }),
        listUserMedia(PROBE_EMAIL, "watchlist", { session }),
      ]);

      const fav = asFavorite.rows.find((r) => r.movieId === BOTH);
      const wl = asWatchlist.rows.find((r) => r.movieId === BOTH);

      assert.equal(
        fav.addedAt.toISOString(),
        "2020-01-01T00:00:00.000Z",
        "the favorites view reports the favorite date"
      );
      assert.equal(
        wl.addedAt.toISOString(),
        "2026-01-01T00:00:00.000Z",
        "the watchlist view reports the watchlist date, not the favorite one"
      );
      assert.equal(fav.personalRating, 9, "the rating travels on the favorites view");
      assert.equal("personalRating" in toWatchlistMovie(wl), false, "a watchlist entry carries no rating");
      assert.equal(toFavoriteMovie(fav).personalRating, 9, "the favorites projection keeps it");
      record("UserMovie: each state reports its own date, and only favorites carry a rating");
    });
  }

  // The cap is enforced by a conditional `$inc` on the member, not by counting first, so
  // two concurrent adds cannot both observe room.
  {
    const { addFavorite, toggleMedia } = await import("../features/media/userMovie.ts");
    const { MAX_FAVORITES, MAX_WATCHLIST } = await import("../lib/bounds.ts");

    await inTransaction(async (session) => {
      await seedUser(session);
      // Sit exactly one below the cap, as the schema would have it.
      await db.collection("users").updateOne(
        { email: PROBE_EMAIL },
        { $set: { favoritesCount: MAX_FAVORITES - 1 } },
        { session }
      );

      // Two different titles, added at the same time, both needing a slot. Only one can
      // have it.
      const mk = (id) => ({ movieId: id, mediaType: "movie", title: id, posterPath: null, voteAverage: 0, releaseDate: null, genreIds: [] });
      const results = await Promise.all([
        addFavorite(PROBE_EMAIL, mk("cap-race-a"), { session }),
        addFavorite(PROBE_EMAIL, mk("cap-race-b"), { session }),
      ]);

      const stored = await db.collection("users").findOne({ email: PROBE_EMAIL }, { session });
      const rows = await db.collection("usermovies").countDocuments(
        { userEmail: PROBE_EMAIL, "favorite.addedAt": { $ne: null } },
        { session }
      );

      assert.equal(results.filter(Boolean).length, 1, "exactly one of the two was granted a slot");
      assert.equal(stored.favoritesCount, MAX_FAVORITES, "the counter never passed the cap");
      // The fixture sets the counter without seeding rows behind it, so only the counter
      // assertion above proves the cap held.
      assert.equal(rows, 1, `only the granted title wrote a row; saw ${rows}`);
      record("UserMovie: concurrent adds cannot both take the last slot");
    });

    // No counter field at all: `$lt` does not match an absent one, so this member would
    // read as full without the `$exists` branch.
    await inTransaction(async (session) => {
      await seedUser(session);
      assert.equal(
        (await db.collection("users").findOne({ email: PROBE_EMAIL }, { session })).favoritesCount,
        undefined,
        "the seeded member has no counter, as a pre-backfill one would not"
      );
      const added = await addFavorite(
        PROBE_EMAIL,
        { movieId: "no-counter", mediaType: "movie", title: "NC", posterPath: null, voteAverage: 0, releaseDate: null, genreIds: [] },
        { session }
      );
      assert.equal(added, true, "a member with no counter can still add");
      const stored = await db.collection("users").findOne({ email: PROBE_EMAIL }, { session });
      assert.equal(stored.favoritesCount, 1, "the counter starts from zero");
      record("UserMovie: a member with no counter is treated as zero, not as full");
    });

    // The routes' shared entry point: add, then remove, then refuse at the cap.
    await inTransaction(async (session) => {
      await seedUser(session);
      await db.collection("users").updateOne(
        { email: PROBE_EMAIL },
        { $set: { watchlistCount: MAX_WATCHLIST } },
        { session }
      );
      const snap = { movieId: "tog-1", mediaType: "movie", title: "Tog", posterPath: null, voteAverage: 0, releaseDate: null, genreIds: [] };

      assert.equal(await toggleMedia({ email: PROBE_EMAIL, state: "watchlist", snapshot: snap }, { session }), "full", "refused at the cap");
      assert.equal(
        await db.collection("usermovies").countDocuments({ userEmail: PROBE_EMAIL, movieId: "tog-1" }, { session }),
        0,
        "the refused toggle wrote no row"
      );
      record("toggleMedia: refuses at the cap without writing");

      // With room, the same toggle adds, then removes on the second call.
      await db.collection("users").updateOne(
        { email: PROBE_EMAIL },
        { $set: { watchlistCount: 0 } },
        { session }
      );
      assert.equal(await toggleMedia({ email: PROBE_EMAIL, state: "watchlist", snapshot: snap }, { session }), "added", "added with room");
      assert.equal(await toggleMedia({ email: PROBE_EMAIL, state: "watchlist", snapshot: snap }, { session }), "removed", "a second call removes");
      const counter = (await db.collection("users").findOne({ email: PROBE_EMAIL }, { session })).watchlistCount;
      assert.equal(counter, 0, "the slot came back on removal");
      record("toggleMedia: add then remove keeps the counter honest");
    });

    // The bug this transaction fixes: the counter slot is claimed, then the row write
    // throws. Without a transaction the claim survives, the counter runs high, and every
    // later add is refused against a cap the member has not reached.
    await inTransaction(async (session) => {
      await seedUser(session);
      const snap = {
        movieId: "fail-1",
        mediaType: "movie",
        title: "Will Not Write",
        posterPath: null,
        voteAverage: 0,
        releaseDate: null,
        genreIds: [],
      };

      await assert.rejects(
        () => addFavorite(PROBE_EMAIL, { ...snap, title: "" }, { session }),
        /without a title/,
        "a write with no title is refused"
      );

      const after = await db.collection("users").findOne({ email: PROBE_EMAIL }, { session });
      assert.equal(after.favoritesCount ?? 0, 0, "the refused write claimed no slot");
      assert.equal(
        await db.collection("usermovies").countDocuments({ userEmail: PROBE_EMAIL }, { session }),
        0,
        "and left no row"
      );
      record("addFavorite: a write that cannot land claims no counter slot");
    });

    // The same guarantee with no session at all: the helper opens its own transaction,
    // so a failure rolls the claim back rather than leaking it.
    {
      await db.collection("users").deleteMany({ email: ROLLBACK_PROBE });
      await db.collection("users").insertOne({
        name: "Rollback",
        email: ROLLBACK_PROBE,
        following: [],
        favoritesCount: 0,
        watchlistCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await assert.rejects(
        () =>
          addFavorite(ROLLBACK_PROBE, {
            movieId: "fail-2",
            mediaType: "movie",
            title: "",
            posterPath: null,
            voteAverage: 0,
            releaseDate: null,
            genreIds: [],
          }),
        /without a title/
      );

      const after = await db.collection("users").findOne({ email: ROLLBACK_PROBE });
      assert.equal(after.favoritesCount, 0, "the self-opened transaction rolled the claim back");
      assert.equal(await db.collection("usermovies").countDocuments({ userEmail: ROLLBACK_PROBE }), 0);

      // And it commits when nothing goes wrong: without a session the helper opens its
      // own transaction, so both the claim and the row have to land for the count to hold.
      await addFavorite(ROLLBACK_PROBE, {
        movieId: "ok-1",
        mediaType: "movie",
        title: "Lands Fine",
        posterPath: null,
        voteAverage: 0,
        releaseDate: null,
        genreIds: [],
      });
      const committed = await db.collection("users").findOne({ email: ROLLBACK_PROBE });
      const rows = await db.collection("usermovies").countDocuments({ userEmail: ROLLBACK_PROBE });
      assert.equal(committed.favoritesCount, 1, "the self-opened transaction commits the claim");
      assert.equal(rows, 1, "and the row, together with it");

      await db.collection("usermovies").deleteMany({ userEmail: ROLLBACK_PROBE });
      await db.collection("users").deleteMany({ email: ROLLBACK_PROBE });
      record("addFavorite: outside a session the claim and the row commit together");
    }
  }
}

// --- the watched gate ------------------------------------------------------------
//
// Rating is only allowed on something watched, and both the gate and the rating live on
// one usermovies row. These assert that marking a title watched is enough to rate it, and
// that the rating lands on the row the detail page reads -- which is what was broken when
// the two lived in separate collections.

{
  const { markWatched } = await import("../features/journal/mutations.ts");
  const { rateFavorite } = await import("../features/media/mutations.ts");
  const { getMediaStatus } = await import("../features/media/userMovie.ts");

  const MID = "777000222";

  // Marking a watched title as watched must reach the row the detail page reads.
  await inTransaction(async (session) => {
    await seedUser(session);

    const before = await getMediaStatus(PROBE_EMAIL, { movieId: MID, mediaType: "movie" }, { session });
    assert.equal(before.isWatched, false, "not watched to begin with");

    await markWatched(
      {
        userEmail: PROBE_EMAIL,
        userName: "Probe",
        movieId: MID,
        movieTitle: "Watch Me",
        posterPath: null,
        mediaType: "movie",
      },
      { session }
    );

    const after = await getMediaStatus(PROBE_EMAIL, { movieId: MID, mediaType: "movie" }, { session });
    assert.equal(after.isWatched, true, "marking watched is visible to the read path");

    // Re-marking must not move the date: watchedAt drives the streaks and insights.
    const row = await db.collection("usermovies").findOne(
      { userEmail: PROBE_EMAIL, movieId: MID },
      { session }
    );
    const firstWatchedAt = row.watched.watchedAt.getTime();

    await markWatched(
      {
        userEmail: PROBE_EMAIL,
        userName: "Probe",
        movieId: MID,
        movieTitle: "Watch Me",
        posterPath: null,
        mediaType: "movie",
      },
      { session }
    );

    const rerow = await db.collection("usermovies").findOne(
      { userEmail: PROBE_EMAIL, movieId: MID },
      { session }
    );
    assert.equal(
      rerow.watched.watchedAt.getTime(),
      firstWatchedAt,
      "re-marking does not move watchedAt"
    );

    record("markWatched: reaches the read path, and re-marking keeps the original date");
  });

  // Rating a watched title must reach the row the detail page reads.
  await inTransaction(async (session) => {
    await seedUser(session);
    await markWatched(
      { userEmail: PROBE_EMAIL, movieId: MID, mediaType: "movie", movieTitle: "Rate Me", posterPath: null },
      { session }
    );

    const rated = await rateFavorite(
      { email: PROBE_EMAIL, movieId: MID, mediaType: "movie", movieTitle: "Rate Me", rating: 9 },
      { session }
    );
    assert.equal(rated.ok, true, "rating accepted");

    const status = await getMediaStatus(PROBE_EMAIL, { movieId: MID, mediaType: "movie" }, { session });
    assert.equal(status.isFavorite, true, "rating created the favorite on the read model");
    assert.equal(status.personalRating, 9, "the rating is what the read model reports");

    // A second rating must overwrite, not accumulate.
    await rateFavorite(
      { email: PROBE_EMAIL, movieId: MID, mediaType: "movie", movieTitle: "Rate Me v2", rating: 4 },
      { session }
    );
    const after = await getMediaStatus(PROBE_EMAIL, { movieId: MID, mediaType: "movie" }, { session });
    assert.equal(after.personalRating, 4, "re-rating overwrites");
    assert.equal(after.isFavorite, true, "still a favorite");

    const row = await db.collection("usermovies").findOne(
      { userEmail: PROBE_EMAIL, movieId: MID },
      { session }
    );
    assert.equal(row.title, "Rate Me v2", "the title refreshes from the same write");

    record("rateFavorite: reaches the read path and overwrites cleanly on re-rating");
  });

  // Rating a title the member never watched is still refused, mirror or not.
  await inTransaction(async (session) => {
    await seedUser(session);
    const refused = await rateFavorite(
      { email: PROBE_EMAIL, movieId: "888000333", mediaType: "movie", movieTitle: "Unwatched", rating: 6 },
      { session }
    );
    assert.equal(refused.ok, false, "an unwatched title is refused");
    assert.equal(refused.reason, "not-watched", "reason is not-watched");

    const row = await db
      .collection("usermovies")
      .findOne({ userEmail: PROBE_EMAIL, movieId: "888000333" }, { session });
    assert.equal(row, null, "a refused rating writes nothing, mirrored or otherwise");

    record("rateFavorite: a refused rating leaves no row behind");
  });
}

// --- report ----------------------------------------------------------------------

const leftovers = await db.collection("users").countDocuments({ email: PROBE_EMAIL });
assert.equal(leftovers, 0, `harness left ${leftovers} probe user(s) behind -- rollback failed`);

await mongoose.disconnect();

console.log(`\n  ${results.length} mutation invariant(s) verified against live Atlas; 0 rows persisted`);
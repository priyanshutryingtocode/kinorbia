import "server-only";

import dbConnect from "@/lib/dbConnect";
import { emailMatch } from "@/lib/emailMatch";
import { buildReviewerMaps } from "@/lib/reviewRatings";
import {
  cursorMatch,
  decodeCursor,
  encodeCursor,
  FEED_PAGE_SIZE,
  FEED_SORT,
  type CursorKey,
} from "@/lib/activityCursor";
import { publiclyVisible } from "@/lib/visibility";
import MovieList from "@/models/MovieList";
import Review from "@/models/Review";
import User from "@/models/User";
import UserMovie from "@/models/UserMovie";
import type { MediaType } from "@/types";

type FeedReview = {
  _id: { toString: () => string };
  userName: string;
  userEmail: string;
  title: string;
  posterPath?: string;
  movieId?: string;
  mediaType?: MediaType;
  body: string;
  spoiler?: boolean;
  createdAt: Date;
};

type FeedList = {
  _id: { toString: () => string };
  userName: string;
  userEmail: string;
  title: string;
  description?: string;
  movies: { posterPath?: string }[];
  createdAt: Date;
};

// A watch carries no body or description: the row renders as a poster, a title, and who
// watched it. `userName` is absent on a usermovies row -- it holds no denormalized name --
// so the username map supplies it, same as the other two kinds.
type FeedWatch = {
  _id: { toString: () => string };
  userEmail: string;
  title: string;
  posterPath?: string;
  movieId: string;
  mediaType: MediaType;
  watchedAt: Date;
};

type MergedRow = {
  kind: "review" | "list" | "watch";
  date: Date;
  sortId: unknown;
} & (Partial<FeedReview> & Partial<FeedList> & Partial<FeedWatch>);

// Exported so features/activity/serializers.ts can type the conversion that decides what
// crosses into the client feed. It is the query's return shape, not a UI concern.
export type FeedRow =
  | { kind: "review"; date: Date; review: FeedReview }
  | { kind: "list"; date: Date; list: FeedList }
  | { kind: "watch"; date: Date; watch: FeedWatch };

type ActivityFeed = {
  rows: FeedRow[];
  // Opaque cursor for the next page, or null at the end. There is no page number and no
  // total: an activity feed grows while it is read, so both would be lies.
  nextCursor: string | null;
  pageSize: number;
  // "Nobody followed" is a different empty state from "followed, nothing new".
  followingCount: number;
  // Plain objects, not Maps: the appended pages are fetched by a client component, and a
  // Map does not survive the server/client boundary. Keys are normalized emails, matching
  // the shape buildReviewerMaps resolves them into.
  usernames: Record<string, string>;
  // Display names, keyed by normalized email. Separate from usernames because a watch row
  // carries no author name of its own and would otherwise print the handle.
  names: Record<string, string>;
  ratingMaps: Record<string, Record<string, number>>;
};

// One shared scope for all three branches: the followee list on the "following" feed, empty
// on the global one. Kept as one value rather than three so a branch cannot drift out of
// step with the others and quietly widen.
type FeedScope = Record<string, unknown>;

// One merged timeline across three collections, so a page is a page. Merging capped
// fetches in JS cannot be paged: the caps are invisible and the boundary between kinds
// moves with the data.
//
// Each side projects flat under a `kind` discriminator, not nested under `payload`. Nesting
// looked right and returned nothing: in `$project` a bare `{ _id: 1, ... }` projects an existing
// path rather than building a document, so the field was dropped.
//
// Every branch carries its OWN cursor `$match` and `$limit`. That is the point of a cursor
// here: filtering after the union would make each branch scan from the top of the timeline
// to fill the page, so the merge cost would grow with depth rather than staying flat.
// `includeWatches` is false on the public Community tab. Watch activity is opt-in and
  // deliberately reaches only the people who follow the member who marked something watched,
  // so serving it to signed-out visitors and to everyone else on a public feed is not a
  // scope the member ever agreed to.
  function mergedPipeline(cursor: CursorKey | null, limit: number, scope: FeedScope, includeWatches: boolean) {
  const visibilityScope = scope;
  const watchScope = scope;
  // `$and`, not a spread of two objects. Both the visibility filter and the cursor are
// `$or` clauses, and spreading them together keeps only the last one written -- which
// silently dropped the visibility filter from page 2 onward and served other members'
// private reviews and lists. Measured as 16 private rows leaking across a 25-page walk.
const windowed = (
    filter: Record<string, unknown>,
    dateField: string,
    kind: "review" | "list" | "watch"
  ) => [
    { $match: { $and: [filter, cursorMatch(cursor, dateField, kind)] } },
    { $sort: { [dateField]: -1, _id: -1 } },
    { $limit: limit },
  ];

  return [
    ...windowed({ ...publiclyVisible(), ...visibilityScope }, "createdAt", "review"),
    {
      $project: {
        kind: { $literal: "review" },
        date: "$createdAt",
        // Tiebreaker across collections: the date alone leaves page boundaries free to
        // shuffle rows sharing a timestamp.
        sortId: "$_id",
        userName: 1,
        userEmail: 1,
        title: 1,
        posterPath: 1,
        movieId: 1,
        mediaType: 1,
        body: 1,
        spoiler: 1,
      },
    },
    {
      $unionWith: {
        coll: MovieList.collection.name,
        pipeline: [
          ...windowed({ ...publiclyVisible(), ...visibilityScope }, "createdAt", "list"),
          {
            $project: {
              kind: { $literal: "list" },
              date: "$createdAt",
              sortId: "$_id",
              userName: 1,
              userEmail: 1,
              title: 1,
              description: 1,
              // The row renders only the first poster, so one entry is
              // transferred instead of a list that can hold hundreds.
              movies: { $slice: [{ $ifNull: ["$movies", []] }, 1] },
            },
          },
        ],
      },
    },
    // Absent entirely rather than filtered to nothing on the Community tab: an always-false
    // `$match` would still plan an index scan per branch and cost a round trip to prove
    // there is nothing there.
    ...(includeWatches
      ? [
          {
            $unionWith: {
              coll: UserMovie.collection.name,
              pipeline: [
                // `watched.broadcast: true` is not decoration: it is what makes the partial
                // index eligible. Page 1 has no cursor bound, so without this predicate the
                // planner falls back to another index and the feed gets slower the deeper it
                // goes. Proven with explain() in scripts/checkDbIntegrity.mjs.
                ...windowed({ ...watchScope, "watched.broadcast": true }, "watched.watchedAt", "watch"),
                {
                  $project: {
                    kind: { $literal: "watch" },
                    date: "$watched.watchedAt",
                    sortId: "$_id",
                    userEmail: 1,
                    title: 1,
                    posterPath: 1,
                    movieId: 1,
                    mediaType: 1,
                  },
                },
              ],
            },
          },
        ]
      : []),
    { $sort: FEED_SORT },
    { $limit: limit },
  ];
}

// One extra row per branch is how the next page is known without a second count query.
const FETCH_LIMIT = FEED_PAGE_SIZE + 1;

// No $facet: there is no total to report any more. The page number was dropped along with
  // it -- an activity feed grows while it is read, so any count taken now is wrong by the
  // time the next page is asked for.
async function fetchFeedPage(cursor: CursorKey | null, scope: FeedScope, includeWatches: boolean) {
  const rows = (await Review.collection
    .aggregate<MergedRow>(mergedPipeline(cursor, FETCH_LIMIT, scope, includeWatches))
    .toArray()) ?? [];
  const hasMore = rows.length > FEED_PAGE_SIZE;
  const page = rows.slice(0, FEED_PAGE_SIZE);

  // The cursor is the LAST row of the page just served, not of the extra row: taking the
  // extra one would skip everything between them.
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor({ date: last.date, kind: last.kind, id: String(last.sortId) })
      : null;

  return { rows: page, nextCursor };
}

export async function getActivityFeed({
  isFollowingFeed,
  sessionEmail,
  cursor: rawCursor,
}: {
  isFollowingFeed: boolean;
  sessionEmail: string | null;
  cursor?: string | null;
}): Promise<ActivityFeed> {
  await dbConnect();

  const following: string[] = [];
  if (isFollowingFeed && sessionEmail) {
    const currentUser = await User.findOne({ email: emailMatch(sessionEmail) })
      .select("following")
      .lean<{ following?: string[] } | null>();
    following.push(...(currentUser?.following || []));
  }

  // A malformed or hand-edited cursor starts from the top rather than erroring: it arrives
  // from the URL, and decodeCursor already decided it was untrustworthy.
  const cursor = decodeCursor(rawCursor);

  // Watch rows carry no visibility field -- a watch is either broadcast or it is not, and
  // that was decided when it was written. So the following feed scopes watches by the same
  // followee list, while the global feed shows only broadcast watches, never all of them.
  const scope: FeedScope = isFollowingFeed ? { userEmail: { $in: following } } : {};

  // Only the Following feed carries watches; the Community feed is public and signed-out reachable.
  const { rows, nextCursor } = await fetchFeedPage(cursor, scope, isFollowingFeed);

  // Byline targets and rating chips from one batched read for the whole page,
  // rather than a lookup per card plus a second read for the same users.
  const { ratingMaps, usernames, names } = await buildReviewerMaps(
    rows.map((row) => row.userEmail)
  );

  return {
    rows: rows.map((row) =>
      row.kind === "review"
        ? { kind: "review" as const, date: row.date, review: row as FeedReview }
        : row.kind === "list"
          ? { kind: "list" as const, date: row.date, list: row as FeedList }
          : { kind: "watch" as const, date: row.date, watch: row as FeedWatch }
    ),
    nextCursor,
    pageSize: FEED_PAGE_SIZE,
    followingCount: following.length,
    usernames: Object.fromEntries(usernames),
    names: Object.fromEntries(names),
    ratingMaps: Object.fromEntries(
      [...ratingMaps].map(([email, ratings]) => [email, Object.fromEntries(ratings)])
    ),
  };
}

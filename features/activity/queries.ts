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

export type FeedRow =
  | { kind: "review"; date: Date; review: FeedReview }
  | { kind: "list"; date: Date; list: FeedList }
  | { kind: "watch"; date: Date; watch: FeedWatch };

type ActivityFeed = {
  rows: FeedRow[];
  nextCursor: string | null;
  pageSize: number;
  followingCount: number;
  usernames: Record<string, string>;
  names: Record<string, string>;
  ratingMaps: Record<string, Record<string, number>>;
};

type FeedScope = Record<string, unknown>;

  function mergedPipeline(cursor: CursorKey | null, limit: number, scope: FeedScope, includeWatches: boolean) {
  const visibilityScope = scope;
  const watchScope = scope;

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
              movies: { $slice: [{ $ifNull: ["$movies", []] }, 1] },
            },
          },
        ],
      },
    },
    ...(includeWatches
      ? [
          {
            $unionWith: {
              coll: UserMovie.collection.name,
              pipeline: [
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

const FETCH_LIMIT = FEED_PAGE_SIZE + 1;

async function fetchFeedPage(cursor: CursorKey | null, scope: FeedScope, includeWatches: boolean) {
  const rows = (await Review.collection
    .aggregate<MergedRow>(mergedPipeline(cursor, FETCH_LIMIT, scope, includeWatches))
    .toArray()) ?? [];
  const hasMore = rows.length > FEED_PAGE_SIZE;
  const page = rows.slice(0, FEED_PAGE_SIZE);

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

  const cursor = decodeCursor(rawCursor);

  const scope: FeedScope = isFollowingFeed ? { userEmail: { $in: following } } : {};

  const { rows, nextCursor } = await fetchFeedPage(cursor, scope, isFollowingFeed);

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

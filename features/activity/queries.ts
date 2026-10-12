import "server-only";

import dbConnect from "@/lib/dbConnect";
import { emailMatch } from "@/lib/emailMatch";
import { buildReviewerMaps } from "@/lib/reviewRatings";
import { INDEX_PAGE_SIZES, pageBounds } from "@/lib/pagination";
import { publiclyVisible } from "@/lib/visibility";
import MovieList from "@/models/MovieList";
import Review from "@/models/Review";
import User from "@/models/User";
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

type MergedRow = {
  kind: "review" | "list";
  date: Date;
  sortId: unknown;
} & (Partial<FeedReview> & Partial<FeedList>);

type FeedRow =
  | { kind: "review"; date: Date; review: FeedReview }
  | { kind: "list"; date: Date; list: FeedList };

type ActivityFeed = {
  rows: FeedRow[];
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
  // "Nobody followed" is a different empty state from "followed, nothing new".
  followingCount: number;
  usernames: Map<string, string>;
  ratingMaps: Map<string, Map<string, number>>;
};

// One merged timeline across two collections, so a page is a page. Merging two capped
// fetches in JS cannot be paged: the caps are invisible and the boundary between
// reviews and lists moves with the data.
//
// Each side projects flat under a `kind` discriminator, not nested under `payload`. Nesting
// looked right and returned nothing: in `$project` a bare `{ _id: 1, ... }` projects an existing
// path rather than building a document, so the field was dropped.
function mergedPipeline(filter: Record<string, unknown>) {
  // Each collection is sorted before the union rather than after, so neither side
  // has to be read in full. The union result is re-sorted because the two sides
  // arrive interleaved rather than concatenated.
  const windowed = [{ $match: filter }, { $sort: { createdAt: -1, _id: -1 } }];

  return [
    ...windowed,
    {
      $project: {
        kind: { $literal: "review" },
        date: "$createdAt",
        // Tiebreaker across two collections: `createdAt` alone would leave page
        // boundaries free to shuffle rows that share a timestamp.
        sortId: "$_id",
        userName: 1,
        userEmail: 1,
        createdAt: 1,
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
          ...windowed,
          {
            $project: {
              kind: { $literal: "list" },
              date: "$createdAt",
              sortId: "$_id",
              userName: 1,
              userEmail: 1,
              createdAt: 1,
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
    { $sort: { date: -1, sortId: -1 } },
  ];
}

// `$facet` gets the window and the total in one round-trip, which matters when
// each one costs a network hop. `$facet` preserves input order, so the sort done
// above is what `rows` arrives in.
async function fetchFeedPage(filter: Record<string, unknown>, page: number) {
  const [result] = await Review.collection
    .aggregate<{ rows: MergedRow[]; total: { count: number }[] }>([
      ...mergedPipeline(filter),
      {
        $facet: {
          rows: [
            { $skip: (page - 1) * INDEX_PAGE_SIZES.activity },
            { $limit: INDEX_PAGE_SIZES.activity },
          ],
          total: [{ $count: "count" }],
        },
      },
    ])
    .toArray();

  const rows = (result?.rows ?? []).map((row) =>
    row.kind === "review"
      ? { kind: "review" as const, date: row.date, review: row as FeedReview }
      : { kind: "list" as const, date: row.date, list: row as FeedList }
  );

  return { rows, total: result?.total?.[0]?.count ?? 0 };
}

export async function getActivityFeed({
  isFollowingFeed,
  sessionEmail,
  requestedPage,
}: {
  isFollowingFeed: boolean;
  sessionEmail: string | null;
  requestedPage: number;
}): Promise<ActivityFeed> {
  await dbConnect();

  const following: string[] = [];
  if (isFollowingFeed && sessionEmail) {
    const currentUser = await User.findOne({ email: emailMatch(sessionEmail) })
      .select("following")
      .lean<{ following?: string[] } | null>();
    following.push(...(currentUser?.following || []));
  }

  const scope = isFollowingFeed ? { userEmail: { $in: following } } : {};
  const feedFilter = { ...publiclyVisible(), ...scope };

  // Clamped the same way `paginate` clamps: an out-of-range page re-reads the
  // last real page rather than rendering an empty timeline.
  const feedPage = await fetchFeedPage(feedFilter, requestedPage);
  const bounds = pageBounds(feedPage.total, requestedPage, INDEX_PAGE_SIZES.activity);
  const rows =
    bounds.page === requestedPage ? feedPage.rows : (await fetchFeedPage(feedFilter, bounds.page)).rows;

  // Byline targets and rating chips from one batched read for the whole page,
  // rather than a lookup per card plus a second read for the same users.
  const { ratingMaps, usernames } = await buildReviewerMaps(
    rows.map((row) => (row.kind === "review" ? row.review.userEmail : row.list.userEmail))
  );

  return {
    rows,
    total: feedPage.total,
    page: bounds.page,
    totalPages: bounds.totalPages,
    pageSize: INDEX_PAGE_SIZES.activity,
    followingCount: following.length,
    usernames,
    ratingMaps,
  };
}
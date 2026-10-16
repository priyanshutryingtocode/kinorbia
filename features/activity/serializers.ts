import "server-only";

import type { SerializedFeedRow } from "@/lib/feedTypes";
import type { FeedRow } from "@/features/activity/queries";

// The only place a feed row becomes something a client component can receive.
//
// React rejects any object with a toJSON method -- every BSON ObjectId -- at RENDER time, so
// this cannot be caught by tsc. The rows used to cross untouched, carrying `_id` and `sortId`
// ObjectIds, and broke the feed at runtime while the build stayed green. Fields are picked by
// name below, so nothing reaches `data` that was not asked for. `_id`, `sortId`, `kind` and
// `date` are already carried separately, so none of them belong in `data`.
//
// The timestamp is `row.date`, never the branch's own field: the aggregate ALIASES it
// (`date: "$createdAt"` / `date: "$watched.watchedAt"`) and inclusion projections do not keep
// the original, so `review.createdAt` is always undefined. Emitting that produced "", and
// ActivityRow's strOr returns a string as-is, so its fallback to `date` never fired and
// `new Date("").toISOString()` threw.

function iso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value ?? "");
}

export function serializeFeedRow(row: FeedRow): SerializedFeedRow {
  const date = iso(row.date);

  if (row.kind === "review") {
    const review = row.review;
    return {
      kind: "review",
      id: String(review._id),
      date,
      data: {
        userEmail: review.userEmail,
        userName: review.userName,
        title: review.title,
        posterPath: review.posterPath ?? null,
        // Read by lookupRating on the client to find this review's rating, not rendered.
        movieId: review.movieId ?? null,
        mediaType: review.mediaType ?? null,
        body: review.body,
        spoiler: Boolean(review.spoiler),
        createdAt: date,
      },
    };
  }

  if (row.kind === "list") {
    const list = row.list;
    return {
      kind: "list",
      id: String(list._id),
      date,
      data: {
        userEmail: list.userEmail,
        userName: list.userName,
        title: list.title,
        description: list.description ?? null,
        // Only the first poster is rendered. Narrowing to it here keeps the rest of the
        // list's embedded documents off the wire instead of shipping them to be ignored.
        movies: (list.movies ?? []).slice(0, 1).map((movie) => ({ posterPath: movie.posterPath ?? null })),
        createdAt: date,
      },
    };
  }

  const watch = row.watch;
  return {
    kind: "watch",
    id: String(watch._id),
    date,
    data: {
      // No userName: a usermovies row holds no denormalised author name, so the username map
      // supplies the byline. Sending an empty one would print "" instead.
      userEmail: watch.userEmail,
      title: watch.title,
      posterPath: watch.posterPath ?? null,
      watchedAt: date,
    },
  };
}

export function serializeFeedRows(rows: FeedRow[]): SerializedFeedRow[] {
  return rows.map(serializeFeedRow);
}
import "server-only";

import type { SerializedFeedRow } from "@/lib/feedTypes";
import type { FeedRow } from "@/features/activity/queries";


function iso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value ?? "");
}

function serializeFeedRow(row: FeedRow): SerializedFeedRow {
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

import type { ReviewItem } from "@/types";

export type RawReview = Omit<ReviewItem, "_id" | "createdAt"> & {
  _id: { toString: () => string };
  createdAt: Date;
};

export function serializeReview(review: RawReview): ReviewItem {
  return {
    _id: review._id.toString(),
    userEmail: review.userEmail,
    userName: review.userName,
    title: review.title,
    posterPath: review.posterPath,
    body: review.body,
    visibility: review.visibility || "public",
    spoiler: Boolean(review.spoiler),
    movieId: review.movieId,
    mediaType: review.mediaType || "movie",
    likedBy: review.likedBy || [],
    savedBy: review.savedBy || [],
    createdAt: review.createdAt.toISOString(),
  };
}
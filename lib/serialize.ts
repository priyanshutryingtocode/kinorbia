import type { JournalItem, MovieListItem, ReviewItem } from "@/types";

export type RawReview = Omit<ReviewItem, "_id" | "createdAt"> & {
  _id: { toString: () => string };
  createdAt: Date;
};

export type RawJournalEntry = Omit<JournalItem, "_id" | "createdAt" | "watchedAt"> & {
  _id: { toString: () => string };
  createdAt: Date;
  watchedAt: Date;
};

export type RawMovieList = Omit<MovieListItem, "_id" | "createdAt"> & {
  _id: { toString: () => string };
  createdAt: Date;
};

export function serializeReview(review: RawReview): ReviewItem {
  return {
    _id: review._id.toString(),
    userEmail: review.userEmail,
    userName: review.userName,
    movieTitle: review.movieTitle,
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

export function serializeJournalEntry(entry: RawJournalEntry): JournalItem {
  return {
    _id: entry._id.toString(),
    movieTitle: entry.movieTitle,
    posterPath: entry.posterPath,
    watchedAt: entry.watchedAt.toISOString(),
    note: entry.note,
    createdAt: entry.createdAt.toISOString(),
    movieId: entry.movieId,
    mediaType: entry.mediaType || "movie",
  };
}

export function serializeList(list: RawMovieList): MovieListItem {
  return {
    _id: list._id.toString(),
    userEmail: list.userEmail,
    userName: list.userName,
    title: list.title,
    description: list.description,
    movies: list.movies,
    visibility: list.visibility || "public",
    likedBy: list.likedBy || [],
    savedBy: list.savedBy || [],
    createdAt: list.createdAt.toISOString(),
  };
}

import type { MovieListItem } from "@/types";

export type RawMovieList = Omit<MovieListItem, "_id" | "createdAt"> & {
  _id: { toString: () => string };
  createdAt: Date;
};

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
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import MovieList from "@/models/MovieList";
import Comment from "@/models/Comment";
import Notification from "@/models/Notification";
import type { FavoriteMovie, ListMovie } from "@/types";

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function toListMovie(movie: FavoriteMovie): ListMovie {
  return {
    movieId: movie.movieId,
    mediaType: movie.mediaType || "movie",
    title: movie.title,
    posterPath: movie.posterPath,
    voteAverage: movie.voteAverage,
    releaseDate: movie.releaseDate,
  };
}

function parseMovieRef(value: string) {
  const [mediaType, ...rest] = value.split(":");
  return {
    mediaType: mediaType === "tv" ? "tv" : "movie",
    movieId: rest.join(":"),
  };
}

export async function createMovieList(formData: FormData) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const email = session.user.email.toLowerCase();

  const title = getRequiredString(formData, "title");
  const description = getRequiredString(formData, "description");
  const visibility = getRequiredString(formData, "visibility") === "private" ? "private" : "public";
  const movieIds = formData.getAll("movieIds").filter((value): value is string => {
    return typeof value === "string" && value.length > 0;
  });
  const refs = movieIds.map(parseMovieRef);

  if (!title) {
    return;
  }

  await dbConnect();
  const user = await User.findOne({ email });
  const favorites = (user?.favorites || []) as FavoriteMovie[];
  const selectedMovies = favorites
    .filter((movie) =>
      refs.some(
        (ref) => ref.movieId === movie.movieId && ref.mediaType === (movie.mediaType || "movie")
      )
    )
    .map(toListMovie);

  await MovieList.create({
    userEmail: email,
    userName: session.user.name || "KinOrbia user",
    title,
    description,
    movies: selectedMovies,
    visibility,
  });

  revalidatePath("/lists");
}

export async function updateMovieList(formData: FormData) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const email = session.user.email.toLowerCase();

  const listId = getRequiredString(formData, "listId");
  const title = getRequiredString(formData, "title");
  const description = getRequiredString(formData, "description");
  const visibility = getRequiredString(formData, "visibility") === "private" ? "private" : "public";
  const movieIds = formData.getAll("movieIds").filter((value): value is string => {
    return typeof value === "string" && value.length > 0;
  });
  const refs = movieIds.map(parseMovieRef);

  if (!listId || !title) {
    return;
  }

  await dbConnect();
  const user = await User.findOne({ email }).lean<{
    favorites?: FavoriteMovie[];
  } | null>();
  const selectedMovies = (user?.favorites || [])
    .filter((movie) =>
      refs.some(
        (ref) => ref.movieId === movie.movieId && ref.mediaType === (movie.mediaType || "movie")
      )
    )
    .map(toListMovie);

  await MovieList.updateOne(
    { _id: listId, userEmail: email },
    { $set: { title, description, visibility, movies: selectedMovies } }
  );

  revalidatePath("/lists");
  revalidatePath(`/lists/${listId}`);
  revalidatePath("/profile");
}

export async function deleteMovieList(formData: FormData) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const email = session.user.email.toLowerCase();

  const listId = getRequiredString(formData, "listId");
  if (!listId) {
    return;
  }

  await dbConnect();
  await MovieList.deleteOne({ _id: listId, userEmail: email });
  await Comment.deleteMany({ parentType: "list", parentId: listId });
  await Notification.deleteMany({ targetType: "list", targetId: listId });

  revalidatePath("/lists");
  revalidatePath(`/lists/${listId}`);
  revalidatePath("/profile");
}

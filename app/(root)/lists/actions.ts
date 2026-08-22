"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import MovieList from "@/models/MovieList";
import Comment from "@/models/Comment";
import Notification from "@/models/Notification";
import { isObjectId } from "@/lib/objectId";
import { MAX_LIST_MOVIES } from "@/lib/bounds";
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

  try {
    const user = await User.findOne({ email }).lean<{
      favorites?: FavoriteMovie[];
    } | null>();
    const favorites = (user?.favorites || []) as FavoriteMovie[];
    const selectedMovies = favorites
      .filter((movie) =>
        refs.some(
          (ref) => ref.movieId === movie.movieId && ref.mediaType === (movie.mediaType || "movie")
        )
      )
      .map(toListMovie);

    if (selectedMovies.length > MAX_LIST_MOVIES) {
      return;
    }

    await MovieList.create({
      userEmail: email,
      userName: session.user.name || "KinOrbia user",
      title,
      description,
      movies: selectedMovies,
      visibility,
    });
  } catch (error) {
    console.error("Error creating list:", error);
    return;
  }

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

  if (!listId || !isObjectId(listId) || !title) {
    return;
  }

  await dbConnect();

  try {
    // The manage form only renders checkboxes for the user's *current*
    // favorites. Movies that were un-favorited since the list was created
    // must be preserved rather than silently dropped on save.
    const [user, existing] = await Promise.all([
      User.findOne({ email }).lean<{ favorites?: FavoriteMovie[] } | null>(),
      MovieList.findOne({ _id: listId, userEmail: email })
        .select("movies")
        .lean<{ movies?: ListMovie[] } | null>(),
    ]);

    const favorites = (user?.favorites || []) as FavoriteMovie[];
    const favoriteKeys = new Set(
      favorites.map((movie) => `${movie.mediaType || "movie"}:${movie.movieId}`)
    );
    const selectedKeys = new Set(refs.map((ref) => `${ref.mediaType}:${ref.movieId}`));

    const selectedMovies = favorites
      .filter((movie) =>
        selectedKeys.has(`${movie.mediaType || "movie"}:${movie.movieId}`)
      )
      .map(toListMovie);

    // Keep list entries that are no longer favorites (they aren't shown in
    // the form, so their absence is not an explicit removal).
    const preserved = (existing?.movies || []).filter(
      (movie) => !favoriteKeys.has(`${movie.mediaType || "movie"}:${movie.movieId}`)
    );

    const mergedMovies = [...preserved, ...selectedMovies];
    if (mergedMovies.length > MAX_LIST_MOVIES) {
      return;
    }

    await MovieList.updateOne(
      { _id: listId, userEmail: email },
      { $set: { title, description, visibility, movies: mergedMovies } }
    );
  } catch (error) {
    console.error("Error updating list:", error);
    return;
  }

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
  if (!listId || !isObjectId(listId)) {
    return;
  }

  try {
    await dbConnect();
    await MovieList.deleteOne({ _id: listId, userEmail: email });
    await Comment.deleteMany({ parentType: "list", parentId: listId });
    await Notification.deleteMany({ targetType: "list", targetId: listId });
  } catch (error) {
    console.error("Error deleting list:", error);
    return;
  }

  revalidatePath("/lists");
  revalidatePath(`/lists/${listId}`);
  revalidatePath("/profile");
}

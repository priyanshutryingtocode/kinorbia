"use server";

import { revalidatePath } from "next/cache";
import { resolveActionArgs, type ActionState } from "@/lib/actionState";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import MovieList from "@/models/MovieList";
import Comment from "@/models/Comment";
import Notification from "@/models/Notification";
import { requireUser, getString } from "@/lib/actions";
import { isObjectId } from "@/lib/objectId";
import { MAX_LIST_MOVIES } from "@/lib/bounds";
import { normalizeMediaType, mediaKey } from "@/lib/media";
import type { FavoriteMovie, ListMovie } from "@/types";

function toListMovie(movie: FavoriteMovie): ListMovie {
  return {
    movieId: movie.movieId,
    mediaType: normalizeMediaType(movie.mediaType),
    title: movie.title,
    posterPath: movie.posterPath,
    voteAverage: movie.voteAverage,
    releaseDate: movie.releaseDate,
  };
}

function parseMovieRef(value: string) {
  const separator = value.indexOf(":");
  if (separator < 1 || separator === value.length - 1) {
    return null;
  }

  return {
    mediaType: normalizeMediaType(value.slice(0, separator)),
    movieId: value.slice(separator + 1),
  };
}

function uniqueFavorites(favorites: FavoriteMovie[]) {
  const unique = new Map<string, FavoriteMovie>();
  favorites.forEach((movie) => {
    const key = mediaKey(movie.mediaType, movie.movieId);
    if (!unique.has(key)) {
      unique.set(key, movie);
    }
  });
  return Array.from(unique.values());
}

export async function createMovieList(
  stateOrFormData: ActionState | FormData,
  formData?: FormData
): Promise<ActionState> {
  const { formData: resolvedFormData } = resolveActionArgs(stateOrFormData, formData);
  const { email, name } = await requireUser();
  const title = getString(resolvedFormData, "title");
  const description = getString(resolvedFormData, "description");
  const visibility = getString(resolvedFormData, "visibility") === "private" ? "private" : "public";
  const selectedKeys = new Set(
    resolvedFormData
      .getAll("movieIds")
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .map((value) => {
        const ref = parseMovieRef(value);
        return ref ? mediaKey(ref.mediaType, ref.movieId) : null;
      })
      .filter((value): value is string => value !== null)
  );

  if (!title) {
    return { status: "error", message: "Add a title for the list." };
  }
  if (title.length > 80) {
    return { status: "error", message: "List titles must be 80 characters or fewer." };
  }
  if (description.length > 300) {
    return { status: "error", message: "Descriptions must be 300 characters or fewer." };
  }

  try {
    await dbConnect();
    const user = await User.findOne({ email }).lean<{
      favorites?: FavoriteMovie[];
    } | null>();
    const favorites = uniqueFavorites((user?.favorites || []) as FavoriteMovie[]);
    const selectedMovies = favorites
      .filter((movie) => selectedKeys.has(mediaKey(movie.mediaType, movie.movieId)))
      .map(toListMovie);

    if (selectedMovies.length > MAX_LIST_MOVIES) {
      return {
        status: "error",
        message: `Choose no more than ${MAX_LIST_MOVIES} titles for a list.`,
      };
    }

    await MovieList.create({
      userEmail: email,
      userName: name,
      title,
      description,
      movies: selectedMovies,
      visibility,
    });
  } catch (error) {
    console.error("Error creating list:", error);
    return { status: "error", message: "The list could not be created. Please try again." };
  }

  revalidatePath("/lists");
  return { status: "success", message: "List created." };
}

export async function updateMovieList(
  stateOrFormData: ActionState | FormData,
  formData?: FormData
): Promise<ActionState> {
  const { formData: resolvedFormData } = resolveActionArgs(stateOrFormData, formData);
  const { email } = await requireUser();
  const listId = getString(resolvedFormData, "listId");
  const title = getString(resolvedFormData, "title");
  const description = getString(resolvedFormData, "description");
  const visibility = getString(resolvedFormData, "visibility") === "private" ? "private" : "public";
  const selectedKeys = new Set(
    resolvedFormData
      .getAll("movieIds")
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .map((value) => {
        const ref = parseMovieRef(value);
        return ref ? mediaKey(ref.mediaType, ref.movieId) : null;
      })
      .filter((value): value is string => value !== null)
  );

  if (!listId || !isObjectId(listId)) {
    return { status: "error", message: "This list could not be found." };
  }
  if (!title) {
    return { status: "error", message: "Add a title for the list." };
  }
  if (title.length > 80) {
    return { status: "error", message: "List titles must be 80 characters or fewer." };
  }
  if (description.length > 300) {
    return { status: "error", message: "Descriptions must be 300 characters or fewer." };
  }

  try {
    await dbConnect();
    const [user, existing] = await Promise.all([
      User.findOne({ email }).lean<{ favorites?: FavoriteMovie[] } | null>(),
      MovieList.findOne({ _id: listId, userEmail: email })
        .select("movies")
        .lean<{ movies?: ListMovie[] } | null>(),
    ]);

    if (!existing) {
      return { status: "error", message: "This list could not be found." };
    }

    const favorites = uniqueFavorites((user?.favorites || []) as FavoriteMovie[]);
    const favoriteKeys = new Set(
      favorites.map((movie) => mediaKey(movie.mediaType, movie.movieId))
    );
    const selectedMovies = favorites
      .filter((movie) => selectedKeys.has(mediaKey(movie.mediaType, movie.movieId)))
      .map(toListMovie);
    const preserved = (existing.movies || []).filter(
      (movie) => !favoriteKeys.has(mediaKey(movie.mediaType, movie.movieId))
    );
    const mergedMovies = [...preserved, ...selectedMovies];

    if (mergedMovies.length > MAX_LIST_MOVIES) {
      return {
        status: "error",
        message: `Lists can contain no more than ${MAX_LIST_MOVIES} titles.`,
      };
    }

    const result = await MovieList.updateOne(
      { _id: listId, userEmail: email },
      { $set: { title, description, visibility, movies: mergedMovies } }
    );

    if (result.matchedCount !== 1) {
      return { status: "error", message: "This list could not be found." };
    }
  } catch (error) {
    console.error("Error updating list:", error);
    return { status: "error", message: "The list could not be updated. Please try again." };
  }

  revalidatePath("/lists");
  revalidatePath(`/lists/${listId}`);
  revalidatePath("/profile");
  return { status: "success", message: "List updated." };
}

export async function deleteMovieList(
  stateOrFormData: ActionState | FormData,
  formData?: FormData
): Promise<ActionState> {
  const { formData: resolvedFormData } = resolveActionArgs(stateOrFormData, formData);
  const { email } = await requireUser();
  const listId = getString(resolvedFormData, "listId");

  if (!listId || !isObjectId(listId)) {
    return { status: "error", message: "This list could not be found." };
  }

  try {
    await dbConnect();
    const result = await MovieList.deleteOne({ _id: listId, userEmail: email });

    if (result.deletedCount !== 1) {
      return { status: "error", message: "This list could not be found." };
    }

    try {
      await Promise.all([
        Comment.deleteMany({ parentType: "list", parentId: listId }),
        Notification.deleteMany({ targetType: "list", targetId: listId }),
      ]);
    } catch (error) {
      console.error("Error cleaning up deleted list data:", error);
    }
  } catch (error) {
    console.error("Error deleting list:", error);
    return { status: "error", message: "The list could not be deleted. Please try again." };
  }

  revalidatePath("/lists");
  revalidatePath(`/lists/${listId}`);
  revalidatePath("/profile");
  return { status: "success", message: "List deleted." };
}

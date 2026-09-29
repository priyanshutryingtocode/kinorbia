"use server";

import { revalidatePath } from "next/cache";
import { resolveActionArgs, type ActionState } from "@/lib/actionState";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import MovieList from "@/models/MovieList";
import Comment from "@/models/Comment";
import Notification from "@/models/Notification";
import { requireUser, getString, parseVisibility } from "@/lib/actions";
import { isObjectId } from "@/lib/objectId";
import { MAX_LIST_MOVIES } from "@/lib/bounds";
import { normalizeMediaType, mediaKey } from "@/lib/media";
import { dedupeFavorites } from "@/lib/reviewRatings";
import { isEmailVerified, VERIFICATION_REQUIRED_MESSAGE } from "@/lib/verification";
import type { ListMovie } from "@/types";

function selectedKeysFrom(formData: FormData) {
  return new Set(
    formData
      .getAll("movieIds")
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .map((value) => {
        const ref = parseMovieRef(value);
        return ref ? mediaKey(ref.mediaType, ref.movieId) : null;
      })
      .filter((value): value is string => value !== null)
  );
}

function validateListFields(title: string, description: string): string | null {
  if (!title) {
    return "Add a title for the list.";
  }
  if (title.length > 80) {
    return "List titles must be 80 characters or fewer.";
  }
  if (description.length > 300) {
    return "Descriptions must be 300 characters or fewer.";
  }
  return null;
}

// Reads only the six fields it copies, so it accepts the projected shape the
// callers pass in rather than requiring a whole FavoriteMovie.
function toListMovie(movie: {
  movieId: string;
  mediaType?: string;
  title: string;
  posterPath: string | null;
  voteAverage: number;
  releaseDate?: string;
}): ListMovie {
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

export async function createMovieList(
  stateOrFormData: ActionState | FormData,
  formData?: FormData
): Promise<ActionState> {
  const { formData: resolvedFormData } = resolveActionArgs(stateOrFormData, formData);
  const { email, name } = await requireUser();
  const title = getString(resolvedFormData, "title");
  const description = getString(resolvedFormData, "description");
  const visibility = parseVisibility(resolvedFormData);
  const selectedKeys = selectedKeysFrom(resolvedFormData);

  const fieldError = validateListFields(title, description);
  if (fieldError) {
    return { status: "error", message: fieldError };
  }

  try {
    await dbConnect();

    if (visibility === "public" && !(await isEmailVerified(email))) {
      return { status: "error", message: VERIFICATION_REQUIRED_MESSAGE };
    }

    // `toListMovie` reads six fields per favorite; `watchlist` is never touched
    // here but was previously transferred in full.
    const user = await User.findOne({ email })
      .select(
        "favorites.movieId favorites.mediaType favorites.title favorites.posterPath favorites.voteAverage favorites.releaseDate"
      )
      .lean<{
        favorites?: {
          movieId: string;
          mediaType?: string;
          title: string;
          posterPath: string | null;
          voteAverage: number;
          releaseDate?: string;
        }[];
      } | null>();
    const favorites = dedupeFavorites(user?.favorites || []);
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
  const visibility = parseVisibility(resolvedFormData);
  const selectedKeys = selectedKeysFrom(resolvedFormData);

  if (!listId || !isObjectId(listId)) {
    return { status: "error", message: "This list could not be found." };
  }
  const fieldError = validateListFields(title, description);
  if (fieldError) {
    return { status: "error", message: fieldError };
  }

  try {
    await dbConnect();

    // Publishing a previously private list is the moment it becomes visible.
    if (visibility === "public" && !(await isEmailVerified(email))) {
      return { status: "error", message: VERIFICATION_REQUIRED_MESSAGE };
    }

    const [user, existing] = await Promise.all([
      User.findOne({ email })
        .select(
          "favorites.movieId favorites.mediaType favorites.title favorites.posterPath favorites.voteAverage favorites.releaseDate"
        )
        .lean<{
          favorites?: {
            movieId: string;
            mediaType?: string;
            title: string;
            posterPath: string | null;
            voteAverage: number;
            releaseDate?: string;
          }[];
        } | null>(),
      MovieList.findOne({ _id: listId, userEmail: email })
        .select("movies")
        .lean<{ movies?: ListMovie[] } | null>(),
    ]);

    if (!existing) {
      return { status: "error", message: "This list could not be found." };
    }

    const favorites = dedupeFavorites(user?.favorites || []);
    const favoriteByKey = new Map(
      favorites.map((movie) => [mediaKey(movie.mediaType, movie.movieId), movie])
    );

    // The picker submits a membership set, not a sequence, so the stored order
    // is the only order a list has. Rebuilding it from `favorites` instead, as
    // this used to, reshuffled every list on every save -- including a title
    // typo fix -- into the User document's favorite insertion order, and
    // reordered it again on the next save if favorites were re-added in
    // between. Walking `existing.movies` keeps the order the Manage form is
    // already displaying, while still taking each entry's data from the
    // current favorite so a retitled or re-rated film does not go stale.
    const mergedMovies: ListMovie[] = [];
    const mergedKeys = new Set<string>();

    for (const movie of existing.movies || []) {
      const key = mediaKey(movie.mediaType, movie.movieId);
      if (mergedKeys.has(key)) {
        continue;
      }
      const favorite = favoriteByKey.get(key);
      if (favorite) {
        // A favorite the user unticked leaves the list.
        if (!selectedKeys.has(key)) {
          continue;
        }
        mergedMovies.push(toListMovie(favorite));
      } else {
        // Not in favorites, so the picker could not have offered it. Keep it.
        mergedMovies.push(movie);
      }
      mergedKeys.add(key);
    }

    for (const movie of favorites) {
      const key = mediaKey(movie.mediaType, movie.movieId);
      if (selectedKeys.has(key) && !mergedKeys.has(key)) {
        mergedMovies.push(toListMovie(movie));
        mergedKeys.add(key);
      }
    }

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

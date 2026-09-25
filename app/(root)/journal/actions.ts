"use server";

import { revalidatePath } from "next/cache";
import { resolveActionArgs, withState, type ActionState } from "@/lib/actionState";
import dbConnect from "@/lib/dbConnect";
import JournalEntry from "@/models/JournalEntry";
import User from "@/models/User";
import { requireUser, getString } from "@/lib/actions";
import { isObjectId } from "@/lib/objectId";
import { normalizeMediaType } from "@/lib/media";
import type { FavoriteMovie } from "@/types";

const MAX_NOTE_LENGTH = 1000;
const MAX_TITLE_LENGTH = 200;


function parseWatchedDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return null;
  }

  return date;
}

export async function createJournalEntry(stateOrFormData: ActionState | FormData, formData?: FormData): Promise<ActionState> {
  const { state, formData: resolvedFormData } = resolveActionArgs(stateOrFormData, formData);
  const { email, name } = await requireUser();

  const favoriteMovieId = getString(resolvedFormData, "favoriteMovieId");
  let movieTitle = getString(resolvedFormData, "movieTitle");
  let movieId = getString(resolvedFormData, "movieId");
  let posterPath = getString(resolvedFormData, "posterPath");
  let mediaType = getString(resolvedFormData, "mediaType") || "movie";
  const note = getString(resolvedFormData, "note");
  const watchedAtValue = getString(resolvedFormData, "watchedAt");
  const watchedAt = parseWatchedDate(watchedAtValue);

  if (!watchedAt) {
    return withState(state, "error", "Choose a valid watched date.");
  }
  if (!movieTitle && !favoriteMovieId) {
    return withState(state, "error", "Choose a favorite or enter a movie title.");
  }
  if (movieTitle.length > MAX_TITLE_LENGTH) {
    return withState(state, "error", "Movie titles must be 200 characters or fewer.");
  }
  if (note.length > MAX_NOTE_LENGTH) {
    return withState(state, "error", "Notes must be 1,000 characters or fewer.");
  }

  try {
    await dbConnect();
    if (favoriteMovieId) {
      const [favMediaType, ...favIdParts] = favoriteMovieId.split(":");
      const favId = favIdParts.join(":");
      const user = await User.findOne({ email })
        .select("favorites")
        .lean<{ favorites?: FavoriteMovie[] } | null>();
      const favorites = (user?.favorites || []) as FavoriteMovie[];
      const favorite = favorites.find(
        (movie) =>
          movie.movieId === favId &&
          normalizeMediaType(favMediaType) === normalizeMediaType(movie.mediaType)
      );

      if (favorite) {
        movieId = favorite.movieId;
        movieTitle = favorite.title;
        posterPath = favorite.posterPath || "";
        mediaType = normalizeMediaType(favorite.mediaType);
      }
    }

    if (!movieTitle) {
      return withState(state, "error", "Choose a favorite or enter a movie title.");
    }

    await JournalEntry.create({
      userEmail: email,
      userName: name,
      movieId: movieId || undefined,
      mediaType,
      movieTitle,
      posterPath: posterPath || undefined,
      watchedAt,
      note,
    });
  } catch (error) {
    console.error("Error creating journal entry:", error);
    return withState(state, "error", "We couldn't add your journal entry. Please try again.");
  }

  revalidatePath("/journal");
  return withState(state, "success", "Journal entry added.");
}

export async function updateJournalEntry(stateOrFormData: ActionState | FormData, formData?: FormData): Promise<ActionState> {
  const { state, formData: resolvedFormData } = resolveActionArgs(stateOrFormData, formData);
  const { email } = await requireUser();

  const entryId = getString(resolvedFormData, "entryId");
  const note = getString(resolvedFormData, "note");
  const watchedAtValue = getString(resolvedFormData, "watchedAt");
  const watchedAt = parseWatchedDate(watchedAtValue);

  if (!entryId || !isObjectId(entryId)) {
    return withState(state, "error", "Choose a valid journal entry to update.");
  }
  if (!watchedAt) {
    return withState(state, "error", "Choose a valid watched date.");
  }
  if (note.length > MAX_NOTE_LENGTH) {
    return withState(state, "error", "Notes must be 1,000 characters or fewer.");
  }

  try {
    await dbConnect();
    const updateResult = await JournalEntry.updateOne(
      { _id: entryId, userEmail: email },
      {
        $set: {
          watchedAt,
          note,
        },
      }
    );

    if (updateResult.matchedCount === 0) {
      return withState(state, "error", "That journal entry is no longer available.");
    }
  } catch (error) {
    console.error("Error updating journal entry:", error);
    return withState(state, "error", "We couldn't update your journal entry. Please try again.");
  }

  revalidatePath("/journal");
  revalidatePath("/profile");
  return withState(state, "success", "Journal entry updated.");
}

export async function deleteJournalEntry(stateOrFormData: ActionState | FormData, formData?: FormData): Promise<ActionState> {
  const { state, formData: resolvedFormData } = resolveActionArgs(stateOrFormData, formData);
  const { email } = await requireUser();

  const entryId = getString(resolvedFormData, "entryId");
  if (!entryId || !isObjectId(entryId)) {
    return withState(state, "error", "Choose a valid journal entry to delete.");
  }

  try {
    await dbConnect();
    const deleteResult = await JournalEntry.deleteOne({ _id: entryId, userEmail: email });

    if (deleteResult.deletedCount === 0) {
      return withState(state, "error", "That journal entry is no longer available.");
    }
  } catch (error) {
    console.error("Error deleting journal entry:", error);
    return withState(state, "error", "We couldn't delete your journal entry. Please try again.");
  }

  revalidatePath("/journal");
  revalidatePath("/profile");
  return withState(state, "success", "Journal entry deleted.");
}

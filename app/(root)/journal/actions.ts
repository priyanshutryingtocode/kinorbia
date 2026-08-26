"use server";

import { revalidatePath } from "next/cache";
import dbConnect from "@/lib/dbConnect";
import JournalEntry from "@/models/JournalEntry";
import User from "@/models/User";
import { requireUser, getString } from "@/lib/actions";
import { isObjectId } from "@/lib/objectId";
import { normalizeMediaType } from "@/lib/media";
import type { FavoriteMovie } from "@/types";

function parseWatchedDate(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

export async function createJournalEntry(formData: FormData) {
  const { email, name } = await requireUser();

  const favoriteMovieId = getString(formData, "favoriteMovieId");
  let movieTitle = getString(formData, "movieTitle");
  let movieId = getString(formData, "movieId");
  let posterPath = getString(formData, "posterPath");
  let mediaType = getString(formData, "mediaType") || "movie";
  const note = getString(formData, "note");
  const watchedAtValue = getString(formData, "watchedAt");

  if (!watchedAtValue || (!movieTitle && !favoriteMovieId)) {
    return;
  }

  await dbConnect();
  if (favoriteMovieId) {
    const [favMediaType, ...favIdParts] = favoriteMovieId.split(":");
    const favId = favIdParts.join(":");
    const user = await User.findOne({ email });
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
    return;
  }

  try {
    await JournalEntry.create({
      userEmail: email,
      userName: name,
      movieId: movieId || undefined,
      mediaType,
      movieTitle,
      posterPath: posterPath || undefined,
      watchedAt: parseWatchedDate(watchedAtValue),
      note,
    });
  } catch (error) {
    console.error("Error creating journal entry:", error);
    return;
  }

  revalidatePath("/journal");
}

export async function updateJournalEntry(formData: FormData) {
  const { email } = await requireUser();

  const entryId = getString(formData, "entryId");
  const note = getString(formData, "note");
  const watchedAtValue = getString(formData, "watchedAt");

  if (!entryId || !isObjectId(entryId) || !watchedAtValue) {
    return;
  }

  try {
    await dbConnect();
    await JournalEntry.updateOne(
      { _id: entryId, userEmail: email },
      {
        $set: {
          watchedAt: parseWatchedDate(watchedAtValue),
          note,
        },
      }
    );
  } catch (error) {
    console.error("Error updating journal entry:", error);
    return;
  }

  revalidatePath("/journal");
  revalidatePath("/profile");
}

export async function deleteJournalEntry(formData: FormData) {
  const { email } = await requireUser();

  const entryId = getString(formData, "entryId");
  if (!entryId || !isObjectId(entryId)) {
    return;
  }

  try {
    await dbConnect();
    await JournalEntry.deleteOne({ _id: entryId, userEmail: email });
  } catch (error) {
    console.error("Error deleting journal entry:", error);
    return;
  }

  revalidatePath("/journal");
  revalidatePath("/profile");
}

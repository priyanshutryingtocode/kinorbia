"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import JournalEntry from "@/models/JournalEntry";
import User from "@/models/User";
import { isObjectId } from "@/lib/objectId";
import type { FavoriteMovie } from "@/types";

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseWatchedDate(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

export async function createJournalEntry(formData: FormData) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const email = session.user.email.toLowerCase();

  const favoriteMovieId = getRequiredString(formData, "favoriteMovieId");
  let movieTitle = getRequiredString(formData, "movieTitle");
  let movieId = getRequiredString(formData, "movieId");
  let posterPath = getRequiredString(formData, "posterPath");
  let mediaType = getRequiredString(formData, "mediaType") || "movie";
  const note = getRequiredString(formData, "note");
  const watchedAtValue = getRequiredString(formData, "watchedAt");

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
        (favMediaType === "tv" ? "tv" : "movie") === (movie.mediaType || "movie")
    );

    if (favorite) {
      movieId = favorite.movieId;
      movieTitle = favorite.title;
      posterPath = favorite.posterPath || "";
      mediaType = favorite.mediaType || "movie";
    }
  }

  if (!movieTitle) {
    return;
  }

  try {
    await JournalEntry.create({
      userEmail: email,
      userName: session.user.name || "KinOrbia user",
      movieId: movieId || undefined,
      mediaType: mediaType === "tv" ? "tv" : "movie",
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
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const email = session.user.email.toLowerCase();

  const entryId = getRequiredString(formData, "entryId");
  const note = getRequiredString(formData, "note");
  const watchedAtValue = getRequiredString(formData, "watchedAt");

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
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const email = session.user.email.toLowerCase();

  const entryId = getRequiredString(formData, "entryId");
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

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import JournalEntry from "@/models/JournalEntry";
import User from "@/models/User";
import type { FavoriteMovie } from "@/types";

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
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
  const ratingValue = formData.get("rating");
  const rating = ratingValue ? Number(ratingValue) : undefined;

  if (!movieTitle || !watchedAtValue) {
    if (!favoriteMovieId) {
      return;
    }
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

  await JournalEntry.create({
    userEmail: email,
    userName: session.user.name || "KinOrbia user",
    movieId: movieId || undefined,
    mediaType: mediaType === "tv" ? "tv" : "movie",
    movieTitle,
    posterPath: posterPath || undefined,
    rating: Number.isFinite(rating) ? Math.min(10, Math.max(1, rating as number)) : undefined,
    watchedAt: new Date(watchedAtValue),
    note,
  });

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
  const ratingValue = formData.get("rating");
  const rating = ratingValue ? Number(ratingValue) : undefined;

  if (!entryId || !watchedAtValue) {
    return;
  }

  await dbConnect();
  await JournalEntry.updateOne(
    { _id: entryId, userEmail: email },
    {
      $set: {
        watchedAt: new Date(watchedAtValue),
        note,
        rating: Number.isFinite(rating) ? Math.min(10, Math.max(1, rating as number)) : undefined,
      },
    }
  );

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
  if (!entryId) {
    return;
  }

  await dbConnect();
  await JournalEntry.deleteOne({ _id: entryId, userEmail: email });

  revalidatePath("/journal");
  revalidatePath("/profile");
}

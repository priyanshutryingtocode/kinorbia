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

  const favoriteMovieId = getRequiredString(formData, "favoriteMovieId");
  let movieTitle = getRequiredString(formData, "movieTitle");
  let movieId = getRequiredString(formData, "movieId");
  let posterPath = getRequiredString(formData, "posterPath");
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
    const user = await User.findOne({ email: session.user.email });
    const favorites = (user?.favorites || []) as FavoriteMovie[];
    const favorite = favorites.find((movie) => movie.movieId === favoriteMovieId);

    if (favorite) {
      movieId = favorite.movieId;
      movieTitle = favorite.title;
      posterPath = favorite.posterPath || "";
    }
  }

  if (!movieTitle) {
    return;
  }

  await JournalEntry.create({
    userEmail: session.user.email,
    userName: session.user.name || "KinOrbia user",
    movieId: movieId || undefined,
    movieTitle,
    posterPath: posterPath || undefined,
    rating: Number.isFinite(rating) ? Math.min(10, Math.max(1, rating as number)) : undefined,
    watchedAt: new Date(watchedAtValue),
    note,
  });

  revalidatePath("/journal");
}

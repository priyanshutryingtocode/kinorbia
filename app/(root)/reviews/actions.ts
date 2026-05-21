"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import Review from "@/models/Review";
import User from "@/models/User";
import type { FavoriteMovie } from "@/types";

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function createReview(formData: FormData) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const favoriteMovieId = getRequiredString(formData, "favoriteMovieId");
  let movieTitle = getRequiredString(formData, "movieTitle");
  const body = getRequiredString(formData, "body");
  let movieId = getRequiredString(formData, "movieId");
  let posterPath = getRequiredString(formData, "posterPath");
  const visibility = getRequiredString(formData, "visibility") === "private" ? "private" : "public";
  const rating = Number(formData.get("rating"));

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

  if (!movieTitle || !body || !Number.isFinite(rating)) {
    return;
  }

  await Review.create({
    userEmail: session.user.email,
    userName: session.user.name || "KinOrbia user",
    movieId: movieId || undefined,
    movieTitle,
    posterPath: posterPath || undefined,
    rating: Math.min(10, Math.max(1, rating)),
    body,
    visibility,
  });

  revalidatePath("/reviews");
}

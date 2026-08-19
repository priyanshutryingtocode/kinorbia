"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import Review from "@/models/Review";
import Comment from "@/models/Comment";
import Notification from "@/models/Notification";
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

  const email = session.user.email.toLowerCase();

  const favoriteMovieId = getRequiredString(formData, "favoriteMovieId");
  let movieTitle = getRequiredString(formData, "movieTitle");
  const body = getRequiredString(formData, "body");
  let movieId = getRequiredString(formData, "movieId");
  let posterPath = getRequiredString(formData, "posterPath");
  let mediaType = getRequiredString(formData, "mediaType") || "movie";
  const visibility = getRequiredString(formData, "visibility") === "private" ? "private" : "public";
  const spoiler = getRequiredString(formData, "spoiler") === "on";

  await dbConnect();
  let favorite: FavoriteMovie | undefined;
  if (favoriteMovieId) {
    const [favMediaType, ...favIdParts] = favoriteMovieId.split(":");
    const favId = favIdParts.join(":");
    const user = await User.findOne({ email });
    const favorites = (user?.favorites || []) as FavoriteMovie[];
    favorite = favorites.find(
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

  if (!movieTitle || !body) {
    return;
  }

  if (!favorite || !(favorite.personalRating && favorite.personalRating > 0)) {
    return;
  }

  await Review.create({
    userEmail: email,
    userName: session.user.name || "KinOrbia user",
    movieId: movieId || undefined,
    mediaType: mediaType === "tv" ? "tv" : "movie",
    movieTitle,
    posterPath: posterPath || undefined,
    body,
    visibility,
    spoiler,
  });

  revalidatePath("/reviews");
}

export async function updateReview(formData: FormData) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const email = session.user.email.toLowerCase();

  const reviewId = getRequiredString(formData, "reviewId");
  const body = getRequiredString(formData, "body");
  const visibility = getRequiredString(formData, "visibility") === "private" ? "private" : "public";
  const spoiler = getRequiredString(formData, "spoiler") === "on";

  if (!reviewId || !body) {
    return;
  }

  await dbConnect();
  await Review.updateOne(
    { _id: reviewId, userEmail: email },
    {
      $set: {
        body,
        visibility,
        spoiler,
      },
    }
  );

  revalidatePath("/reviews");
  revalidatePath("/profile");
}

export async function deleteReview(formData: FormData) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const email = session.user.email.toLowerCase();

  const reviewId = getRequiredString(formData, "reviewId");
  if (!reviewId) {
    return;
  }

  await dbConnect();
  await Review.deleteOne({ _id: reviewId, userEmail: email });
  await Comment.deleteMany({ parentType: "review", parentId: reviewId });
  await Notification.deleteMany({ targetType: "review", targetId: reviewId });

  revalidatePath("/reviews");
  revalidatePath("/profile");
}

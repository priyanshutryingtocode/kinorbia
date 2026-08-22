"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import Review from "@/models/Review";
import Comment from "@/models/Comment";
import Notification from "@/models/Notification";
import User from "@/models/User";
import { isObjectId } from "@/lib/objectId";
import type { FavoriteMovie } from "@/types";

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function isTruthyCheckbox(value: string) {
  return value === "on" || value === "true" || value === "1";
}

export async function createReview(formData: FormData) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const email = session.user.email.toLowerCase();

  const favoriteMovieId = getRequiredString(formData, "favoriteMovieId");
  const body = getRequiredString(formData, "body");
  const visibility = getRequiredString(formData, "visibility") === "private" ? "private" : "public";
  const spoiler = isTruthyCheckbox(getRequiredString(formData, "spoiler"));

  if (!favoriteMovieId || !body) {
    return;
  }

  await dbConnect();

  const [favMediaType, ...favIdParts] = favoriteMovieId.split(":");
  const favId = favIdParts.join(":");
  const user = await User.findOne({ email }).lean<{
    favorites?: FavoriteMovie[];
  } | null>();
  const favorites = (user?.favorites || []) as FavoriteMovie[];
  const favorite = favorites.find(
    (movie) =>
      movie.movieId === favId &&
      (favMediaType === "tv" ? "tv" : "movie") === (movie.mediaType || "movie")
  );

  // Reviews are derived from rated favorites; without one there is nothing
  // to review.
  if (!favorite || !favorite.personalRating || favorite.personalRating <= 0) {
    return;
  }

  try {
    await Review.create({
      userEmail: email,
      userName: session.user.name || "KinOrbia user",
      movieId: favorite.movieId,
      mediaType: favorite.mediaType === "tv" ? "tv" : "movie",
      movieTitle: favorite.title,
      posterPath: favorite.posterPath || undefined,
      body,
      visibility,
      spoiler,
    });
  } catch (error) {
    console.error("Error creating review:", error);
    return;
  }

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
  const spoiler = isTruthyCheckbox(getRequiredString(formData, "spoiler"));

  if (!reviewId || !isObjectId(reviewId) || !body) {
    return;
  }

  try {
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
  } catch (error) {
    console.error("Error updating review:", error);
    return;
  }

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
  if (!reviewId || !isObjectId(reviewId)) {
    return;
  }

  try {
    await dbConnect();
    await Review.deleteOne({ _id: reviewId, userEmail: email });
    await Comment.deleteMany({ parentType: "review", parentId: reviewId });
    await Notification.deleteMany({ targetType: "review", targetId: reviewId });
  } catch (error) {
    console.error("Error deleting review:", error);
    return;
  }

  revalidatePath("/reviews");
  revalidatePath("/profile");
}

"use server";

import { revalidatePath } from "next/cache";
import dbConnect from "@/lib/dbConnect";
import Review from "@/models/Review";
import Comment from "@/models/Comment";
import Notification from "@/models/Notification";
import User from "@/models/User";
import { requireUser, getString } from "@/lib/actions";
import { isObjectId } from "@/lib/objectId";
import { normalizeMediaType } from "@/lib/media";
import type { FavoriteMovie } from "@/types";

function isTruthyCheckbox(value: string) {
  return value === "on" || value === "true" || value === "1";
}

export async function createReview(formData: FormData) {
  const { email, name } = await requireUser();

  const favoriteMovieId = getString(formData, "favoriteMovieId");
  const body = getString(formData, "body");
  const visibility = getString(formData, "visibility") === "private" ? "private" : "public";
  const spoiler = isTruthyCheckbox(getString(formData, "spoiler"));

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
      normalizeMediaType(favMediaType) === normalizeMediaType(movie.mediaType)
  );

  // Reviews are derived from rated favorites; without one there is nothing
  // to review.
  if (!favorite || !favorite.personalRating || favorite.personalRating <= 0) {
    return;
  }

  try {
    await Review.create({
      userEmail: email,
      userName: name,
      movieId: favorite.movieId,
      mediaType: normalizeMediaType(favorite.mediaType),
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
  const { email } = await requireUser();

  const reviewId = getString(formData, "reviewId");
  const body = getString(formData, "body");
  const visibility = getString(formData, "visibility") === "private" ? "private" : "public";
  const spoiler = isTruthyCheckbox(getString(formData, "spoiler"));

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
  const { email } = await requireUser();

  const reviewId = getString(formData, "reviewId");
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

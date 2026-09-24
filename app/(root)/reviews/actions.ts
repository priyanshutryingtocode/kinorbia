"use server";

import { revalidatePath } from "next/cache";
import { resolveActionArgs, type ActionState } from "@/lib/actionState";
import dbConnect from "@/lib/dbConnect";
import Review from "@/models/Review";
import Comment from "@/models/Comment";
import Notification from "@/models/Notification";
import User from "@/models/User";
import { requireUser, getString } from "@/lib/actions";
import { isObjectId } from "@/lib/objectId";
import { normalizeMediaType } from "@/lib/media";
import type { FavoriteMovie } from "@/types";

const MAX_REVIEW_LENGTH = 1200;

function withState(state: ActionState, status: ActionState["status"], message: string): ActionState {
  return { ...state, status, message };
}

function isTruthyCheckbox(value: string) {
  return value === "on" || value === "true" || value === "1";
}

export async function createReview(stateOrFormData: ActionState | FormData, formData?: FormData): Promise<ActionState> {
  const { state, formData: resolvedFormData } = resolveActionArgs(stateOrFormData, formData);
  const { email, name } = await requireUser();

  const favoriteMovieId = getString(resolvedFormData, "favoriteMovieId");
  const body = getString(resolvedFormData, "body");
  const visibility = getString(resolvedFormData, "visibility") === "private" ? "private" : "public";
  const spoiler = isTruthyCheckbox(getString(resolvedFormData, "spoiler"));

  if (!favoriteMovieId) {
    return withState(state, "error", "Choose a rated movie before publishing.");
  }
  if (!body) {
    return withState(state, "error", "Write a review before publishing.");
  }
  if (body.length > MAX_REVIEW_LENGTH) {
    return withState(state, "error", "Reviews must be 1,200 characters or fewer.");
  }

  try {
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

    if (!favorite || !favorite.personalRating || favorite.personalRating <= 0) {
      return withState(state, "error", "Choose one of your rated movies before publishing.");
    }

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
    return withState(state, "error", "We couldn't publish your review. Please try again.");
  }

  revalidatePath("/reviews");
  return withState(state, "success", "Review published.");
}

export async function updateReview(stateOrFormData: ActionState | FormData, formData?: FormData): Promise<ActionState> {
  const { state, formData: resolvedFormData } = resolveActionArgs(stateOrFormData, formData);
  const { email } = await requireUser();

  const reviewId = getString(resolvedFormData, "reviewId");
  const body = getString(resolvedFormData, "body");
  const visibility = getString(resolvedFormData, "visibility") === "private" ? "private" : "public";
  const spoiler = isTruthyCheckbox(getString(resolvedFormData, "spoiler"));

  if (!reviewId || !isObjectId(reviewId)) {
    return withState(state, "error", "Choose a valid review to update.");
  }
  if (!body) {
    return withState(state, "error", "A review cannot be empty.");
  }
  if (body.length > MAX_REVIEW_LENGTH) {
    return withState(state, "error", "Reviews must be 1,200 characters or fewer.");
  }

  try {
    await dbConnect();
    const updateResult = await Review.updateOne(
      { _id: reviewId, userEmail: email },
      {
        $set: {
          body,
          visibility,
          spoiler,
        },
      }
    );

    if (updateResult.matchedCount === 0) {
      return withState(state, "error", "That review is no longer available.");
    }
  } catch (error) {
    console.error("Error updating review:", error);
    return withState(state, "error", "We couldn't update your review. Please try again.");
  }

  revalidatePath("/reviews");
  revalidatePath("/profile");
  return withState(state, "success", "Review updated.");
}

export async function deleteReview(stateOrFormData: ActionState | FormData, formData?: FormData): Promise<ActionState> {
  const { state, formData: resolvedFormData } = resolveActionArgs(stateOrFormData, formData);
  const { email } = await requireUser();

  const reviewId = getString(resolvedFormData, "reviewId");
  if (!reviewId || !isObjectId(reviewId)) {
    return withState(state, "error", "Choose a valid review to delete.");
  }

  try {
    await dbConnect();
    const deleteResult = await Review.deleteOne({ _id: reviewId, userEmail: email });

    if (deleteResult.deletedCount === 0) {
      return withState(state, "error", "That review is no longer available.");
    }

    try {
      await Comment.deleteMany({ parentType: "review", parentId: reviewId });
      await Notification.deleteMany({ targetType: "review", targetId: reviewId });
    } catch (error) {
      console.error("Error cleaning up deleted review data:", error);
    }
  } catch (error) {
    console.error("Error deleting review:", error);
    return withState(state, "error", "We couldn't delete your review. Please try again.");
  }

  revalidatePath("/reviews");
  revalidatePath("/profile");
  return withState(state, "success", "Review deleted.");
}

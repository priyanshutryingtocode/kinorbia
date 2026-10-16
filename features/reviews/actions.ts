"use server";

import { revalidatePath } from "next/cache";
import { resolveActionArgs, withState, type ActionState } from "@/lib/actionState";
import { requireUser, getString, parseVisibility } from "@/lib/actions";
import { isEmailVerified, VERIFICATION_REQUIRED_MESSAGE } from "@/lib/verification";
import { isObjectId } from "@/lib/objectId";
import { editReview, publishReview, removeReview, MAX_REVIEW_LENGTH } from "@/features/reviews/mutations";
import { logger } from "@/lib/logger";

function isTruthyCheckbox(value: string) {
  return value === "on" || value === "true" || value === "1";
}

export async function createReview(
  stateOrFormData: ActionState | FormData,
  formData?: FormData
): Promise<ActionState> {
  const { state, formData: resolvedFormData } = resolveActionArgs(stateOrFormData, formData);
  const { email, name } = await requireUser();

  const favoriteMovieId = getString(resolvedFormData, "favoriteMovieId");
  const body = getString(resolvedFormData, "body");
  const visibility = parseVisibility(resolvedFormData);
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
    if (visibility === "public" && !(await isEmailVerified(email))) {
      return withState(state, "error", VERIFICATION_REQUIRED_MESSAGE);
    }

    const result = await publishReview({
      authorEmail: email,
      authorName: name,
      favoriteMovieId,
      body,
      visibility,
      spoiler,
    });

    if (result === "no-rated-favorite") {
      return withState(state, "error", "Choose one of your rated movies before publishing.");
    }
    if (result === "failed") {
      return withState(state, "error", "We couldn't publish your review. Please try again.");
    }
  } catch (error) {
    logger.error("Error creating review:", { error: error });
    return withState(state, "error", "We couldn't publish your review. Please try again.");
  }

  revalidatePath("/reviews");
  return withState(state, "success", "Review published.");
}

export async function updateReview(
  stateOrFormData: ActionState | FormData,
  formData?: FormData
): Promise<ActionState> {
  const { state, formData: resolvedFormData } = resolveActionArgs(stateOrFormData, formData);
  const { email } = await requireUser();

  const reviewId = getString(resolvedFormData, "reviewId");
  const body = getString(resolvedFormData, "body");
  const visibility = parseVisibility(resolvedFormData);
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
    // Flipping a private review to public is the moment it becomes visible, so
    // that is where the check belongs rather than on create alone.
    if (visibility === "public" && !(await isEmailVerified(email))) {
      return withState(state, "error", VERIFICATION_REQUIRED_MESSAGE);
    }

    const result = await editReview({ authorEmail: email, reviewId, body, visibility, spoiler });

    if (result === "not-found") {
      return withState(state, "error", "That review is no longer available.");
    }
  } catch (error) {
    logger.error("Error updating review:", { error: error });
    return withState(state, "error", "We couldn't update your review. Please try again.");
  }

  revalidatePath("/reviews");
  revalidatePath("/profile");
  return withState(state, "success", "Review updated.");
}

export async function deleteReview(
  stateOrFormData: ActionState | FormData,
  formData?: FormData
): Promise<ActionState> {
  const { state, formData: resolvedFormData } = resolveActionArgs(stateOrFormData, formData);
  const { email } = await requireUser();

  const reviewId = getString(resolvedFormData, "reviewId");
  if (!reviewId || !isObjectId(reviewId)) {
    return withState(state, "error", "Choose a valid review to delete.");
  }

  try {
    const result = await removeReview({ authorEmail: email, reviewId });

    if (result === "not-found") {
      return withState(state, "error", "That review is no longer available.");
    }
  } catch (error) {
    logger.error("Error deleting review:", { error: error });
    return withState(state, "error", "We couldn't delete your review. Please try again.");
  }

  revalidatePath("/reviews");
  revalidatePath("/profile");
  return withState(state, "success", "Review deleted.");
}
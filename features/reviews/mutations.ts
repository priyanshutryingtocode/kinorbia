import "server-only";

import dbConnect from "@/lib/dbConnect";
import { findFavoriteByMediaKey } from "@/lib/reviewRatings";
import { normalizeMediaType } from "@/lib/media";
import Comment from "@/models/Comment";
import Notification from "@/models/Notification";
import Review from "@/models/Review";
import type { ClientSession } from "mongoose";
import { logger } from "@/lib/logger";

export const MAX_REVIEW_LENGTH = 1200;

type MutationOptions = { session?: ClientSession };

type WriteResult = "ok" | "not-found" | "failed";

type PublishReviewResult = WriteResult | "no-rated-favorite";

// Publishes a review, attached to one of the member's rated favorites.
//
// The favorite is resolved server-side from the submitted key rather than trusting form
// fields: a member can post about a title they never rated by editing the request, and the
// review would exist with no rating to read back.
export async function publishReview(
  input: {
    authorEmail: string;
    authorName: string;
    favoriteMovieId: string;
    body: string;
    visibility: "public" | "private";
    spoiler: boolean;
  },
  { session }: MutationOptions = {}
): Promise<PublishReviewResult> {
  await dbConnect();

  const favorite = await findFavoriteByMediaKey(input.authorEmail, input.favoriteMovieId);

  if (!favorite || !favorite.personalRating || favorite.personalRating <= 0) {
    return "no-rated-favorite";
  }

  try {
    await Review.create(
      [
        {
          userEmail: input.authorEmail,
          userName: input.authorName,
          movieId: favorite.movieId,
          mediaType: normalizeMediaType(favorite.mediaType),
          title: favorite.title,
          posterPath: favorite.posterPath || undefined,
          body: input.body,
          visibility: input.visibility,
          spoiler: input.spoiler,
        },
      ],
      session ? { session } : {}
    );
  } catch (error) {
    // The member gets a generic retry, but not silently: a rejected write with no log is
    // indistinguishable from a database blip once it is in production.
    logger.error("Error creating review:", { error });
    return "failed";
  }

  return "ok";
}

export async function editReview(
  input: {
    authorEmail: string;
    reviewId: string;
    body: string;
    visibility: "public" | "private";
    spoiler: boolean;
  },
  { session }: MutationOptions = {}
): Promise<WriteResult> {
  await dbConnect();
  const opts = session ? { session } : {};

  const result = await Review.updateOne(
    { _id: input.reviewId, userEmail: input.authorEmail },
    { $set: { body: input.body, visibility: input.visibility, spoiler: input.spoiler } },
    opts
  );

  return result.matchedCount === 0 ? "not-found" : "ok";
}

// Deletes a review, then everything that hangs off it.
//
// Cleanup is best-effort by design: orphaned comments are untidy, whereas failing the
// delete over tidy-up leaves a member unable to remove what they wrote. Errors go to the
// caller's logger rather than being swallowed.
export async function removeReview(
  input: { authorEmail: string; reviewId: string },
  { session }: MutationOptions = {}
): Promise<WriteResult> {
  await dbConnect();
  const opts = session ? { session } : {};

  const deleted = await Review.deleteOne(
    { _id: input.reviewId, userEmail: input.authorEmail },
    opts
  );

  if (deleted.deletedCount === 0) {
    return "not-found";
  }

  try {
    await Comment.deleteMany({ parentType: "review", parentId: input.reviewId }, opts);
    await Notification.deleteMany({ targetType: "review", targetId: input.reviewId }, opts);
  } catch (error) {
    logger.error("Error cleaning up deleted review data:", { error: error });
  }

  return "ok";
}
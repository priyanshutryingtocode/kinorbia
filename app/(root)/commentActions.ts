"use server";

import { revalidatePath } from "next/cache";
import { resolveActionArgs, withState, type ActionState } from "@/lib/actionState";
import dbConnect from "@/lib/dbConnect";
import Comment from "@/models/Comment";
import MovieList from "@/models/MovieList";
import Notification from "@/models/Notification";
import Review from "@/models/Review";
import { requireUser, getString } from "@/lib/actions";
import { rateLimit } from "@/lib/rateLimit";
import { isObjectId } from "@/lib/objectId";
import { normalizeMediaType } from "@/lib/media";


export async function createComment(stateOrFormData: ActionState | FormData, formData?: FormData): Promise<ActionState> {
  const { state, formData: resolvedFormData } = resolveActionArgs(stateOrFormData, formData);
  const { email, name } = await requireUser();

  if (!(await rateLimit(`comments:${email}`, { limit: 10, windowMs: 60 * 1000 }))) {
    return withState(state, "error", "You are commenting too quickly. Try again shortly.");
  }

  const parentType = getString(resolvedFormData, "parentType");
  const parentId = getString(resolvedFormData, "parentId");
  const body = getString(resolvedFormData, "body");
  const path = getString(resolvedFormData, "path");

  if (!["review", "list"].includes(parentType) || !isObjectId(parentId) || !body) {
    return withState(state, "error", "Write a comment before posting.");
  }
  if (body.length > 500) {
    return withState(state, "error", "Comments must be 500 characters or fewer.");
  }

  await dbConnect();
  const Model = parentType === "review" ? Review : MovieList;
  const parent = await Model.findOne({ _id: parentId, visibility: "public" })
    .select("userEmail movieTitle title movieId mediaType")
    .lean<{
      userEmail: string;
      movieTitle?: string;
      title?: string;
      movieId?: string;
      mediaType?: "movie" | "tv";
    } | null>();

  if (!parent) {
    return withState(state, "error", "This discussion is no longer available.");
  }

  let comment;
  try {
    comment = await Comment.create({
      parentType,
      parentId,
      userEmail: email,
      userName: name,
      body,
    });
  } catch (error) {
    console.error("Error creating comment:", error);
    return withState(state, "error", "Your comment could not be posted. Please try again.");
  }

  if (parent.userEmail !== email) {
    try {
      await Notification.create({
        userEmail: parent.userEmail,
        type: "comment",
        actorEmail: email,
        actorName: name,
        targetType: parentType as "review" | "list",
        targetId: parentId,
        targetTitle: parentType === "review" ? parent.movieTitle || "" : parent.title || "",
        commentId: comment._id.toString(),
        movieId: parentType === "review" ? parent.movieId || "" : "",
        mediaType: parentType === "review" ? normalizeMediaType(parent.mediaType) : "movie",
      });
    } catch (error) {
      console.error("Error creating comment notification:", error);
    }
  }

  if (path) {
    revalidatePath(path);
  }
  return withState(state, "success", "Comment posted.");
}

export async function deleteComment(stateOrFormData: ActionState | FormData, formData?: FormData): Promise<ActionState> {
  const { state, formData: resolvedFormData } = resolveActionArgs(stateOrFormData, formData);
  const { email } = await requireUser();
  const commentId = getString(resolvedFormData, "commentId");
  const path = getString(resolvedFormData, "path");

  if (!isObjectId(commentId)) {
    return withState(state, "error", "This comment could not be found.");
  }

  await dbConnect();
  try {
    const comment = await Comment.findOne({ _id: commentId, userEmail: email }).select(
      "parentType parentId userEmail"
    );

    if (!comment) {
      return withState(state, "error", "This comment is no longer available.");
    }

    await Comment.deleteOne({ _id: commentId, userEmail: email });

    if (comment.parentId && comment.parentType) {
      try {
        await Notification.deleteOne({
          type: "comment",
          actorEmail: email,
          targetType: comment.parentType,
          targetId: comment.parentId.toString(),
          commentId,
        });
        await Notification.deleteMany({
          type: "comment",
          actorEmail: email,
          targetType: comment.parentType,
          targetId: comment.parentId.toString(),
          commentId: "",
        });
      } catch (error) {
        console.error("Error cleaning up comment notification:", error);
      }
    }
  } catch (error) {
    console.error("Error deleting comment:", error);
    return withState(state, "error", "Your comment could not be deleted. Please try again.");
  }

  if (path) {
    revalidatePath(path);
  }
  return withState(state, "success", "Comment deleted.");
}

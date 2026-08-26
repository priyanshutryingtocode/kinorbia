"use server";

import { revalidatePath } from "next/cache";
import dbConnect from "@/lib/dbConnect";
import Comment from "@/models/Comment";
import MovieList from "@/models/MovieList";
import Notification from "@/models/Notification";
import Review from "@/models/Review";
import { requireUser, getString } from "@/lib/actions";
import { rateLimit } from "@/lib/rateLimit";
import { isObjectId } from "@/lib/objectId";
import { normalizeMediaType } from "@/lib/media";

export async function createComment(formData: FormData) {
  const { email, name } = await requireUser();

  if (!rateLimit(`comments:${email}`, { limit: 10, windowMs: 60 * 1000 })) {
    return;
  }

  const parentType = getString(formData, "parentType");
  const parentId = getString(formData, "parentId");
  const body = getString(formData, "body");
  const path = getString(formData, "path");

  if (!["review", "list"].includes(parentType) || !isObjectId(parentId) || !body) {
    return;
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
    return;
  }

  try {
    const comment = await Comment.create({
      parentType,
      parentId,
      userEmail: email,
      userName: name,
      body,
    });

    if (parent.userEmail !== email) {
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
    }
  } catch (error) {
    console.error("Error creating comment:", error);
    return;
  }

  if (path) {
    revalidatePath(path);
  }
}

export async function deleteComment(formData: FormData) {
  const { email } = await requireUser();
  const commentId = getString(formData, "commentId");
  const path = getString(formData, "path");

  if (!isObjectId(commentId)) {
    return;
  }

  await dbConnect();
  try {
    const comment = await Comment.findOne({ _id: commentId, userEmail: email }).select(
      "parentType parentId userEmail"
    );

    if (!comment) {
      return;
    }

    await Comment.deleteOne({ _id: commentId, userEmail: email });

    if (comment.parentId && comment.parentType) {
      // Scope cleanup to this specific comment so other comments by the same
      // actor on the same target keep their notifications.
      await Notification.deleteOne({
        type: "comment",
        actorEmail: email,
        targetType: comment.parentType,
        targetId: comment.parentId.toString(),
        commentId,
      });
      // Legacy notifications created before commentId existed.
      await Notification.deleteMany({
        type: "comment",
        actorEmail: email,
        targetType: comment.parentType,
        targetId: comment.parentId.toString(),
        commentId: "",
      });
    }
  } catch (error) {
    console.error("Error deleting comment:", error);
    return;
  }

  if (path) {
    revalidatePath(path);
  }
}

import "server-only";

import { logger } from "@/lib/logger";
import dbConnect from "@/lib/dbConnect";
import { publiclyVisible } from "@/lib/visibility";
import { normalizeMediaType } from "@/lib/media";
import Comment from "@/models/Comment";
import MovieList from "@/models/MovieList";
import Notification from "@/models/Notification";
import Review from "@/models/Review";
import type { ClientSession } from "mongoose";

type MutationOptions = { session?: ClientSession };

export const MAX_COMMENT_LENGTH = 500;

type CreateCommentResult =
  | { ok: true; commentId: string }
  | { ok: false; reason: "parent-unavailable" | "write-failed" };

export async function postComment(
  input: {
    authorEmail: string;
    authorName: string;
    parentType: "review" | "list";
    parentId: string;
    body: string;
  },
  { session }: MutationOptions = {}
): Promise<CreateCommentResult> {
  await dbConnect();
  const opts = session ? { session } : {};

  const Model = input.parentType === "review" ? Review : MovieList;
  const parent = await Model.findOne({ _id: input.parentId, ...publiclyVisible() })
    .select("userEmail title movieId mediaType")
    .session(session ?? null)
    .lean<{
      userEmail: string;
      title?: string;
      movieId?: string;
      mediaType?: "movie" | "tv";
    } | null>();

  if (!parent) {
    return { ok: false, reason: "parent-unavailable" };
  }

  let created: Array<{ _id: { toString: () => string } }>;
  try {
    created = await Comment.create(
      [
        {
          parentType: input.parentType,
          parentId: input.parentId,
          userEmail: input.authorEmail,
          userName: input.authorName,
          body: input.body,
        },
      ],
      opts
    );
  } catch (error) {
    logger.error("Error creating comment:", { error });
    return { ok: false, reason: "write-failed" };
  }

  const commentId = created[0]._id.toString();

  if (parent.userEmail !== input.authorEmail) {
    try {
      await Notification.create(
        [
          {
            userEmail: parent.userEmail,
            type: "comment",
            actorEmail: input.authorEmail,
            actorName: input.authorName,
            targetType: input.parentType,
            targetId: input.parentId,
            targetTitle: parent.title || "",
            commentId,
            movieId: input.parentType === "review" ? parent.movieId || "" : "",
            mediaType:
              input.parentType === "review" ? normalizeMediaType(parent.mediaType) : "movie",
          },
        ],
        opts
      );
    } catch (error) {
      logger.error("Error creating notification:", { error });
    }
  }

  return { ok: true, commentId };
}

type DeleteCommentResult = "deleted" | "not-found" | "write-failed";

export async function removeComment(
  input: { actorEmail: string; commentId: string },
  { session }: MutationOptions = {}
): Promise<DeleteCommentResult> {
  await dbConnect();
  const opts = session ? { session } : {};

  const comment = await Comment.findOne({ _id: input.commentId, userEmail: input.actorEmail })
    .select("parentType parentId userEmail")
    .session(session ?? null);

  if (!comment) {
    return "not-found";
  }

  await Comment.deleteOne({ _id: input.commentId, userEmail: input.actorEmail }, opts);

  if (comment.parentId && comment.parentType) {
    await Notification.deleteOne(
      {
        type: "comment",
        actorEmail: input.actorEmail,
        targetType: comment.parentType,
        targetId: comment.parentId.toString(),
        commentId: input.commentId,
      },
      opts
    );
    await Notification.deleteMany(
      {
        type: "comment",
        actorEmail: input.actorEmail,
        targetType: comment.parentType,
        targetId: comment.parentId.toString(),
        commentId: "",
      },
      opts
    );
  }

  return "deleted";
}
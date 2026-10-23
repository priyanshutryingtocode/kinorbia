import type { CommentItem } from "@/types";

export type RawComment = Omit<CommentItem, "_id" | "createdAt" | "parentType" | "parentId"> & {
  _id: { toString: () => string };
  createdAt: Date;
};

export function serializeComment(
  comment: RawComment,
  parentType: CommentItem["parentType"],
  parentId: string
): CommentItem {
  return {
    _id: comment._id.toString(),
    parentType,
    parentId,
    userEmail: comment.userEmail,
    userName: comment.userName,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
  };
}
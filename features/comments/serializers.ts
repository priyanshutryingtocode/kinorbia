import type { CommentItem } from "@/types";

export type RawComment = Omit<CommentItem, "_id" | "createdAt" | "parentType" | "parentId"> & {
  _id: { toString: () => string };
  createdAt: Date;
};

// `parentType` and `parentId` are not stored on the Comment: a comment belongs to whichever
// document it was written under, and the fetching query already knew that. Supplied by the
// caller so the client can thread a reply or delete back through.
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
import "server-only";

import dbConnect from "@/lib/dbConnect";
import { serializeComment, type RawComment } from "@/features/comments/serializers";
import Comment from "@/models/Comment";
import type { CommentItem } from "@/types";

const COMMENT_LIMIT = 200;

export async function getCommentThread({
  parentType,
  parentId,
}: {
  parentType: CommentItem["parentType"];
  parentId: string;
}): Promise<CommentItem[]> {
  await dbConnect();

  const raw = await Comment.find({ parentType, parentId })
    .sort({ createdAt: 1 })
    .limit(COMMENT_LIMIT)
    .lean<RawComment[]>();

  return raw.map((comment) => serializeComment(comment, parentType, parentId));
}
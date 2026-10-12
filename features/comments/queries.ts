import "server-only";

import dbConnect from "@/lib/dbConnect";
import { serializeComment, type RawComment } from "@/features/comments/serializers";
import Comment from "@/models/Comment";
import type { CommentItem } from "@/types";

const COMMENT_LIMIT = 200;

// A discussion thread is oldest-first so it reads as a conversation. The cap is not
// a pagination scheme: a thread longer than this has always been truncated rather
// than paged, and changing that here would be a behaviour change rather than a move.
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
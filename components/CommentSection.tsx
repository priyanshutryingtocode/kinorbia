import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import Comment from "@/models/Comment";
import type { CommentItem } from "@/types";
import CommentForm from "./CommentForm";
import CommentList from "./CommentList";

type RawComment = {
  _id: { toString: () => string };
  userEmail: string;
  userName: string;
  body: string;
  createdAt: Date;
};

type CommentSectionProps = {
  parentType: "review" | "list";
  parentId: string;
  path: string;
};

export default async function CommentSection({ parentType, parentId, path }: CommentSectionProps) {
  const session = await auth();
  const currentUserEmail = session?.user?.email?.toLowerCase();

  await dbConnect();
  const rawComments = await Comment.find({ parentType, parentId })
    .sort({ createdAt: 1 })
    .limit(200)
    .lean<RawComment[]>();

  const comments: CommentItem[] = rawComments.map((comment) => ({
    _id: comment._id.toString(),
    parentType,
    parentId,
    userEmail: comment.userEmail,
    userName: comment.userName,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
  }));

  if (comments.length === 0 && !currentUserEmail) {
    return null;
  }

  return (
    <section className="mt-5 border-t border-rule pt-4" aria-label="Comments">
      {comments.length > 0 && (
        <div className="mb-3">
          <h3 className="font-display text-base font-medium text-content">
            Comments <span className="text-content-subtle">({comments.length})</span>
          </h3>
          <CommentList comments={comments} currentUserEmail={currentUserEmail} path={path} />
        </div>
      )}
      {currentUserEmail && <CommentForm parentType={parentType} parentId={parentId} path={path} />}
    </section>
  );
}
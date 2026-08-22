"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteComment } from "@/app/(root)/commentActions";
import SubmitButton from "./SubmitButton";
import type { CommentItem } from "@/types";

type CommentListProps = {
  comments: CommentItem[];
  currentUserEmail?: string;
  path: string;
};

const INITIAL_VISIBLE = 20;

export default function CommentList({ comments, currentUserEmail, path }: CommentListProps) {
  const [expanded, setExpanded] = useState(false);

  if (comments.length === 0) {
    return null;
  }

  const visible = expanded ? comments : comments.slice(0, INITIAL_VISIBLE);
  const hiddenCount = comments.length - visible.length;

  return (
    <div className="space-y-2">
      {visible.map((comment) => (
        <div key={comment._id} className="rounded-lg border border-white/10 bg-neutral-950/60 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-neutral-400">
              {comment.userName}
              <span className="ml-2 font-normal text-neutral-600">
                {new Date(comment.createdAt).toLocaleDateString()}
              </span>
            </p>
            {comment.userEmail === currentUserEmail && (
              <form action={deleteComment}>
                <input type="hidden" name="commentId" value={comment._id} />
                <input type="hidden" name="path" value={path} />
                <SubmitButton
                  pendingLabel="..."
                  className="p-1 text-neutral-600 transition hover:text-red-400"
                  aria-label="Delete comment"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </SubmitButton>
              </form>
            )}
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-200">{comment.body}</p>
        </div>
      ))}
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-xs font-bold uppercase tracking-wider text-neutral-500 hover:text-red-400 transition"
        >
          Show {hiddenCount} more {hiddenCount === 1 ? "comment" : "comments"}
        </button>
      )}
    </div>
  );
}
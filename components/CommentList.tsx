"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteComment } from "@/app/(root)/commentActions";
import ActionForm from "./ActionForm";
import type { CommentItem } from "@/types";
import SubmitButton from "./SubmitButton";

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
    <div>
      <ol className="kin-editorial-list">
        {visible.map((comment) => (
          <li key={comment._id} className="kin-editorial-row">
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 text-xs">
                  <span className="font-semibold text-content">{comment.userName}</span>
                  <time className="ml-2 text-content-subtle" dateTime={comment.createdAt}>
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </time>
                </p>
                {comment.userEmail === currentUserEmail && (
                  <ActionForm action={deleteComment} successMessage="Comment deleted." className="shrink-0">
                    <input type="hidden" name="commentId" value={comment._id} />
                    <input type="hidden" name="path" value={path} />
                    <SubmitButton
                      pendingLabel="..."
                      variant="quiet"
                      className="min-h-8 px-2 text-content-subtle hover:text-red-300"
                      aria-label={`Delete comment by ${comment.userName}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </SubmitButton>
                  </ActionForm>
                )}
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-content-muted [overflow-wrap:anywhere]">{comment.body}</p>
            </div>
          </li>
        ))}
      </ol>
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="kin-focus mt-2 rounded-control text-xs font-medium text-content-muted transition-colors hover:text-highlight"
        >
          Show {hiddenCount} more {hiddenCount === 1 ? "comment" : "comments"}
        </button>
      )}
    </div>
  );
}

"use client";

import { useId } from "react";
import { MessageSquare } from "lucide-react";
import { createComment } from "@/app/(root)/commentActions";
import ActionForm from "./ActionForm";
import SubmitButton from "./SubmitButton";

type CommentFormProps = {
  parentType: "review" | "list";
  parentId: string;
  path: string;
};

export default function CommentForm({ parentType, parentId, path }: CommentFormProps) {
  const bodyId = useId();

  return (
    <ActionForm action={createComment} successMessage="Comment posted." resetOnSuccess className="mt-3 flex items-center gap-2">
      <input type="hidden" name="parentType" value={parentType} />
      <input type="hidden" name="parentId" value={parentId} />
      <input type="hidden" name="path" value={path} />
      <label htmlFor={bodyId} className="sr-only">
        Add a comment
      </label>
      <input
        id={bodyId}
        name="body"
        required
        maxLength={500}
        placeholder="Add a comment..."
        className="kin-input min-w-0 flex-1"
      />
      <SubmitButton
        pendingLabel="..."
        variant="secondary"
        className="h-10 w-10 shrink-0 px-0"
        aria-label="Post comment"
      >
        <MessageSquare className="h-4 w-4" aria-hidden="true" />
      </SubmitButton>
    </ActionForm>
  );
}

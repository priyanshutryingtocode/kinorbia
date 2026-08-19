"use client";

import { MessageSquare } from "lucide-react";
import { createComment } from "@/app/(root)/commentActions";
import SubmitButton from "./SubmitButton";

type CommentFormProps = {
  parentType: "review" | "list";
  parentId: string;
  path: string;
};

export default function CommentForm({ parentType, parentId, path }: CommentFormProps) {
  return (
    <form action={createComment} className="mt-3 flex items-center gap-2">
      <input type="hidden" name="parentType" value={parentType} />
      <input type="hidden" name="parentId" value={parentId} />
      <input type="hidden" name="path" value={path} />
      <input
        name="body"
        required
        maxLength={500}
        placeholder="Add a comment..."
        className="min-w-0 flex-1 rounded-full border border-white/10 bg-neutral-950/70 px-4 py-2 text-sm text-white placeholder:text-neutral-600 focus:border-red-500 focus:outline-none"
      />
      <SubmitButton
        pendingLabel="..."
        className="shrink-0 rounded-full border border-white/10 bg-white/5 p-2 text-neutral-400 transition hover:bg-white/10 hover:text-white"
        aria-label="Post comment"
      >
        <MessageSquare className="h-4 w-4" />
      </SubmitButton>
    </form>
  );
}
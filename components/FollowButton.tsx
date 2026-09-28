"use client";

import { useActionState } from "react";
import { toggleFollow, type FollowState } from "@/app/(root)/followActions";
import SubmitButton from "./SubmitButton";

type FollowButtonProps = {
  targetUserId: string;
  targetName?: string;
  isFollowing: boolean;
  path: string;
};

export default function FollowButton({
  targetUserId,
  targetName,
  isFollowing,
  path,
}: FollowButtonProps) {
  const [state, formAction] = useActionState<FollowState, FormData>(toggleFollow, undefined);
  const action = isFollowing ? "Unfollow" : "Follow";

  return (
    <form action={formAction} className="flex flex-col items-end gap-1.5">
      <input type="hidden" name="targetUserId" value={targetUserId} />
      <input type="hidden" name="operation" value={isFollowing ? "unfollow" : "follow"} />
      <input type="hidden" name="path" value={path} />
      <SubmitButton
        pendingLabel={isFollowing ? "Unfollowing..." : "Following..."}
        aria-label={targetName ? `${action} ${targetName}` : undefined}
        className={`kin-focus shrink-0 rounded-sm border px-3 py-1.5 text-xs font-semibold transition-colors ${
          isFollowing
            ? "border-white/15 bg-transparent text-content hover:border-gold/40 hover:text-gold"
            : "border-accent bg-accent text-content hover:bg-accent-hover"
        }`}
      >
        {isFollowing ? "Following" : "Follow"}
      </SubmitButton>
      {state?.error && (
        <p className="kin-focus max-w-56 text-right text-[11px] leading-4 text-amber-300/90">
          {state.error}
        </p>
      )}
    </form>
  );
}

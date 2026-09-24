"use client";

import { toggleFollow } from "@/app/(root)/followActions";
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
  const action = isFollowing ? "Unfollow" : "Follow";

  return (
    <form action={toggleFollow}>
      <input type="hidden" name="targetUserId" value={targetUserId} />
      <input type="hidden" name="operation" value={isFollowing ? "unfollow" : "follow"} />
      <input type="hidden" name="path" value={path} />
      <SubmitButton
        pendingLabel={isFollowing ? "Unfollowing..." : "Following..."}
        aria-label={targetName ? `${action} ${targetName}` : undefined}
        className={`kin-focus shrink-0 rounded-sm border px-3 py-1.5 text-xs font-semibold transition-colors ${
          isFollowing
            ? "border-white/15 bg-transparent text-neutral-300 hover:border-gold/40 hover:text-gold"
            : "border-red-500 bg-red-600 text-white hover:bg-red-500"
        }`}
      >
        {isFollowing ? "Following" : "Follow"}
      </SubmitButton>
    </form>
  );
}

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
        className={`kin-focus shrink-0 rounded-full border px-5 py-2 text-sm font-medium transition ${
          isFollowing
            ? "border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white"
            : "border-red-600 bg-red-600 text-white hover:bg-red-500"
        }`}
      >
        {isFollowing ? "Following" : "Follow"}
      </SubmitButton>
    </form>
  );
}

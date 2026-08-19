"use client";

import { toggleFollow } from "@/app/(root)/followActions";
import SubmitButton from "./SubmitButton";

type FollowButtonProps = {
  targetEmail: string;
  isFollowing: boolean;
  path: string;
};

export default function FollowButton({ targetEmail, isFollowing, path }: FollowButtonProps) {
  return (
    <form action={toggleFollow}>
      <input type="hidden" name="targetEmail" value={targetEmail} />
      <input type="hidden" name="path" value={path} />
      <SubmitButton
        pendingLabel={isFollowing ? "Unfollowing..." : "Following..."}
        className={`shrink-0 rounded-full px-5 py-2 text-sm font-medium border transition ${
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
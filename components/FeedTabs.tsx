"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function FeedTabs() {
  const searchParams = useSearchParams();
  const isFollowing = searchParams.get("feed") === "following";

  const classes = (active: boolean) =>
    `rounded-full px-4 py-2 text-sm font-medium transition-all ${
      active
        ? "bg-red-500/12 text-red-200 ring-1 ring-red-500/25"
        : "text-neutral-400 hover:bg-white/7 hover:text-white"
    }`;

  return (
    <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/3 p-1 w-fit">
      <Link href="/activity" className={classes(!isFollowing)}>
        Community
      </Link>
      <Link href="/activity?feed=following" className={classes(isFollowing)}>
        Following
      </Link>
    </div>
  );
}
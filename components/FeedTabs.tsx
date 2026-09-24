"use client";

import { useSearchParams } from "next/navigation";
import LinkTabs from "./LinkTabs";

export default function FeedTabs() {
  const searchParams = useSearchParams();
  const isFollowing = searchParams.get("feed") === "following";

  return (
    <LinkTabs
      ariaLabel="Activity feed"
      activeItem={isFollowing ? "following" : "community"}
      items={[
        { key: "community", label: "Community", href: "/activity" },
        { key: "following", label: "Following", href: "/activity?feed=following" },
      ]}
    />
  );
}
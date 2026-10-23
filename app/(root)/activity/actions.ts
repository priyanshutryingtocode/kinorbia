"use server";

import { getActivityFeed } from "@/features/activity/queries";
import { serializeFeedRows } from "@/features/activity/serializers";
import { auth } from "@/auth";

export async function loadMoreActivity({
  cursor,
  isFollowingFeed,
}: {
  cursor: string | null;
  isFollowingFeed: boolean;
}) {
  const session = await auth();
  const sessionEmail = session?.user?.email ?? null;

  const feed = await getActivityFeed({
    isFollowingFeed: isFollowingFeed && Boolean(sessionEmail),
    sessionEmail,
    cursor,
  });

  return {
    results: serializeFeedRows(feed.rows),
    nextCursor: feed.nextCursor,
    usernames: feed.usernames,
    names: feed.names,
    ratingMaps: feed.ratingMaps,
  };
}
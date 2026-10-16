"use server";

import { getActivityFeed } from "@/features/activity/queries";
import { serializeFeedRows } from "@/features/activity/serializers";
import { auth } from "@/auth";

// Appends one page of activity for the client's cursor walk.
//
// The signed-in member is resolved here rather than accepted from the client, so a crafted
// request cannot read another member's following feed. The "following" feed is already
// auth-gated on the page; this keeps the gate on the data too, since the action is
// separately callable.
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
    // The same serializer the server render uses. A server action's return value crosses
    // into the client by the same rules as a prop, so it needed the same conversion; when
    // the two halves hand-roll it, they drift.
    results: serializeFeedRows(feed.rows),
    nextCursor: feed.nextCursor,
    usernames: feed.usernames,
    names: feed.names,
    ratingMaps: feed.ratingMaps,
  };
}
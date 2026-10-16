import { redirect } from "next/navigation";
import type { Metadata } from "next";
import RouteShell from "@/components/RouteShell";
import PageHeader from "@/components/PageHeader";
import FeedTabs from "@/components/FeedTabs";
import EmptyState from "@/components/EmptyState";
import ActivityLoadMore from "@/components/ActivityLoadMore";
import type { SerializedFeedRow } from "@/lib/feedTypes";
import { serializeFeedRows } from "@/features/activity/serializers";
import { auth } from "@/auth";
import { getActivityFeed } from "@/features/activity/queries";
import { loadMoreActivity } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Activity",
  description: "The latest public reviews and lists shared by the KinOrbia community.",
};

type ActivityPageProps = {
  searchParams: Promise<{ feed?: string }> | { feed?: string };
};

// No `page` param: the feed pages by cursor now. A page number over an ever-growing
// timeline repeats and skips rows as new activity lands between loads, and deep links to
// `/activity?page=3` would resolve to a different set of rows every time they were opened.
export default async function ActivityPage({ searchParams }: ActivityPageProps) {
  const { feed } = await searchParams;
  const isFollowingFeed = feed === "following";

  const session = await auth();
  const sessionEmail = session?.user?.email ?? null;
  if (isFollowingFeed && !sessionEmail) {
    redirect("/login");
  }

  const feedPage = await getActivityFeed({ isFollowingFeed, sessionEmail, cursor: null });

  const seed: SerializedFeedRow[] = serializeFeedRows(feedPage.rows);

  return (
    <RouteShell spacing="standard" width="standard">
      <PageHeader
        eyebrow="Community"
        title="Activity"
        description={
          isFollowingFeed
            ? "Reviews, lists and watches from the members you follow."
            : "Fresh public reviews and lists from KinOrbia members. Watches are shared only with the people who follow you."
        }
      />

      <div className="mt-6">
        <FeedTabs />
      </div>

      {isFollowingFeed && feedPage.followingCount === 0 ? (
        <EmptyState
          compact
          headingLevel={2}
          className="mt-8"
          title="You are not following anyone yet"
          description="Follow members from their profiles and their reviews, lists and watches will show up here."
        />
      ) : seed.length > 0 ? (
        <ActivityLoadMore
          // The tabs are client-side navigations to the same segment, so React reconciles
          // position-for-position and keeps this component's hook state. Without a key the
          // Following feed inherits the Community feed's cursor and its appended rows -- see
          // useCursorFeed, which captures seed and cursor in useState.
          key={isFollowingFeed ? "following" : "community"}
          seed={seed}
          seedUsernames={feedPage.usernames}
          seedNames={feedPage.names}
          seedRatingMaps={feedPage.ratingMaps}
          seedCursor={feedPage.nextCursor}
          isFollowingFeed={isFollowingFeed}
          fetchPage={loadMoreActivity}
        />
      ) : (
        <EmptyState
          compact
          headingLevel={2}
          className="mt-8"
          title="Nothing here yet"
          description={
            isFollowingFeed
              ? "Members you follow haven't shared anything recently."
              : "Be the first to share a review or list."
          }
        />
      )}
    </RouteShell>
  );
}
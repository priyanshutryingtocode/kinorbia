import Link from "next/link";
import { redirect } from "next/navigation";
import { List, MessageSquare, Star } from "lucide-react";
import type { Metadata } from "next";
import RouteShell from "@/components/RouteShell";
import PageHeader from "@/components/PageHeader";
import TmdbPosterImage from "@/components/TmdbPosterImage";
import SpoilerText from "@/components/SpoilerText";
import { renderRichText } from "@/lib/renderRichText";
import FeedTabs from "@/components/FeedTabs";
import EmptyState from "@/components/EmptyState";
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import { buildReviewerRatingMaps, lookupRating } from "@/lib/reviewRatings";
import { buildUsernameMap, usernameFor } from "@/lib/profileLinks";
import UserNameLink from "@/components/UserNameLink";
import type { MediaType } from "@/types";
import User from "@/models/User";
import MovieList from "@/models/MovieList";
import Review from "@/models/Review";
import { tmdbImage } from "@/lib/media";
import { emailMatch } from "@/lib/emailMatch";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Activity",
  description: "The latest reviews and lists shared by the KinOrbia community.",
};

type ActivityPageProps = {
  searchParams: Promise<{ feed?: string }> | { feed?: string };
};

export default async function ActivityPage({ searchParams }: ActivityPageProps) {
  const { feed } = await searchParams;
  const isFollowingFeed = feed === "following";

  const session = await auth();
  const sessionEmail = session?.user?.email ?? null;
  if (isFollowingFeed && !sessionEmail) {
    redirect("/login");
  }

  await dbConnect();

  const following: string[] = [];
  if (isFollowingFeed && sessionEmail) {
    const currentUser = await User.findOne({ email: emailMatch(sessionEmail) })
      .select("following")
      .lean<{ following?: string[] } | null>();
    following.push(...(currentUser?.following || []));
  }

  const scope = isFollowingFeed
    ? { userEmail: { $in: following } }
    : {};

  const [reviews, lists] = await Promise.all([
    // Projected because the feed renders neither the unbounded likedBy/savedBy
    // arrays nor the full `movies` array -- only the first poster of each list.
    Review.find({ visibility: "public", ...scope })
      .select("_id userName userEmail movieTitle posterPath movieId mediaType body spoiler createdAt")
      .sort({ createdAt: -1 })
      .limit(12)
      .lean<{
        _id: { toString: () => string };
        userName: string;
        userEmail: string;
        movieTitle: string;
        posterPath?: string;
        movieId?: string;
        mediaType?: MediaType;
        body: string;
        spoiler?: boolean;
        createdAt: Date;
      }[]>(),
    MovieList.find({ visibility: "public", ...scope })
      .select("_id userEmail userName title description createdAt movies.movieId movies.title movies.posterPath")
      .sort({ createdAt: -1 })
      .limit(8)
      .lean<{
        _id: { toString: () => string };
        userName: string;
        userEmail: string;
        title: string;
        description?: string;
        movies: { posterPath?: string; title: string; movieId: string }[];
        createdAt: Date;
      }[]>(),
  ]);

  const ratingMaps = await buildReviewerRatingMaps(
    reviews.map((review) => ({
      userEmail: review.userEmail,
      movieId: review.movieId,
      mediaType: review.mediaType,
    }))
  );

  // Byline targets, resolved in one batched read for the whole feed.
  const usernames = await buildUsernameMap([
    ...reviews.map((review) => review.userEmail),
    ...lists.map((list) => list.userEmail),
  ]);

  const items = [
    ...reviews.map((review) => ({ kind: "review" as const, date: review.createdAt, review })),
    ...lists.map((list) => ({ kind: "list" as const, date: list.createdAt, list })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 18);

  return (
    <RouteShell spacing="standard" width="standard">
      <PageHeader
        eyebrow="Community"
        title="Activity"
        description={
          isFollowingFeed
            ? "Fresh reviews and lists from the members you follow."
            : "Fresh public reviews and lists from KinOrbia members."
        }
      />

      <div className="mt-6">
        <FeedTabs />
      </div>

      {isFollowingFeed && following.length === 0 ? (
        <EmptyState
          compact
          headingLevel={2}
          className="mt-8"
          title="You are not following anyone yet"
          description="Follow members from their profiles and their reviews and lists will show up here."
        />
      ) : items.length > 0 ? (
        <ol className="kin-editorial-list mt-8" aria-label="Activity feed">
          {items.map((item) => {
            if (item.kind === "review") {
              const poster = tmdbImage(item.review.posterPath, "w185");
              const rating = lookupRating(ratingMaps, item.review);

              return (
                <li
                  key={`review-${item.review._id}`}
                  className="kin-editorial-row gap-4 transition-colors hover:bg-surface/40"
                >
                  <div className="relative h-24 w-16 shrink-0 overflow-hidden bg-surface-raised">
                    {poster ? (
                      <TmdbPosterImage
                        src={poster}
                        alt={item.review.movieTitle}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-content-subtle">
                        <MessageSquare className="h-5 w-5" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                  <article className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-content-subtle">
                      <span className="font-semibold uppercase tracking-overline text-content-muted">
                        <UserNameLink
                          userName={item.review.userName}
                          username={usernameFor(usernames, item.review.userEmail)}
                        />{" "}
                        reviewed
                      </span>
                      <span aria-hidden="true">·</span>
                      <time dateTime={new Date(item.review.createdAt).toISOString()}>
                        {new Date(item.review.createdAt).toLocaleDateString()}
                      </time>
                      {rating > 0 && (
                        <span
                          className="inline-flex items-center gap-1 font-semibold text-highlight"
                          aria-label={`${rating} out of 10`}
                        >
                          <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                          {(rating / 2).toFixed(1)} stars
                        </span>
                      )}
                    </div>
                    <h2 className="mt-2 break-words font-display text-xl font-medium leading-tight text-content">
                      {item.review.movieTitle}
                    </h2>
                    {item.review.spoiler && (
                      <span className="mt-2 inline-flex items-center border border-highlight/25 bg-highlight-soft px-2 py-1 text-overline font-medium uppercase tracking-overline text-highlight">
                        Spoiler
                      </span>
                    )}
                    <div className="mt-3 min-w-0 break-words">
                      {item.review.spoiler ? (
                        <SpoilerText text={item.review.body} />
                      ) : (
                        // renderRichText, so **bold**, *italic* and [links](url)
                        // render here as they do on the review cards instead of
                        // showing their asterisks and brackets.
                        <div className="whitespace-pre-wrap break-words text-sm leading-6 text-content-muted">
                          {renderRichText(item.review.body)}
                        </div>
                      )}
                    </div>
                  </article>
                </li>
              );
            }

            const poster = tmdbImage(item.list.movies?.[0]?.posterPath, "w185");

            return (
              <li
                key={`list-${item.list._id}`}
                className="kin-editorial-row gap-4 transition-colors hover:bg-surface/40"
              >
                <div className="relative h-24 w-16 shrink-0 overflow-hidden bg-surface-raised">
                  {poster ? (
                    <TmdbPosterImage
                      src={poster}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-highlight">
                      <List className="h-5 w-5" aria-hidden="true" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  {/* The byline sits outside the <Link> on purpose. It used to be
                      inside, which made the author's name un-linkable -- an anchor
                      inside an anchor is invalid HTML and unreachable by keyboard.
                      The trade-off is that the byline row is no longer part of the
                      click target; the title and description are. */}
                  <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-content-subtle">
                    <span className="font-semibold uppercase tracking-overline text-content-muted">
                      <UserNameLink
                        userName={item.list.userName}
                        username={usernameFor(usernames, item.list.userEmail)}
                      />{" "}
                      created a list
                    </span>
                    <span aria-hidden="true">·</span>
                    <time dateTime={new Date(item.list.createdAt).toISOString()}>
                      {new Date(item.list.createdAt).toLocaleDateString()}
                    </time>
                  </div>
                  <Link
                    href={`/lists/${item.list._id}`}
                    className="kin-focus group block py-0.5"
                  >
                    <h2 className="mt-2 flex min-w-0 items-start gap-2 break-words font-display text-xl font-medium leading-tight text-content transition-colors group-hover:text-highlight">
                      <List className="mt-1 h-4 w-4 shrink-0 text-highlight" aria-hidden="true" />
                      <span className="min-w-0 break-words">{item.list.title}</span>
                    </h2>
                    {item.list.description && (
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-content-muted">
                        {item.list.description}
                      </p>
                    )}
                  </Link>
                </div>
              </li>
            );
          })}
        </ol>
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

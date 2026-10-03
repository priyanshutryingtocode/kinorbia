import Link from "next/link";
import dbConnect from "@/lib/dbConnect";
import { publiclyVisible } from "@/lib/visibility";
import MovieList from "@/models/MovieList";
import Review from "@/models/Review";
import { mediaEquals, mediaHref, starsLabel } from "@/lib/media";
import { buildReviewerRatingMaps, lookupRating } from "@/lib/reviewRatings";
import { buildUsernameMap, usernameFor } from "@/lib/profileLinks";
import UserNameLink from "@/components/UserNameLink";
import { renderRichText } from "@/lib/renderRichText";
import type { MediaType } from "@/types";
import EmptyState from "@/components/EmptyState";
import CommentSection from "@/components/CommentSection";
import SpoilerText from "@/components/SpoilerText";

export default async function MovieReviewsAndLists({
  movieId,
  mediaType = "movie",
}: {
  movieId: string;
  mediaType?: "movie" | "tv";
}) {
  await dbConnect();
  const [publicReviews, publicLists] = await Promise.all([
    // Projected, because this component renders on every film detail page and a
    // Review carries unbounded likedBy/savedBy arrays that nothing here reads.
    // `createdAt` is used only for the sort, which the database applies, so it
    // does not need to travel back.
    Review.find({ movieId, mediaType: mediaEquals(mediaType), ...publiclyVisible() })
      .select("_id userEmail userName movieId mediaType body spoiler")
      .sort({ createdAt: -1 })
      .limit(4)
      .lean<{
        _id: { toString: () => string };
        userName: string;
        userEmail: string;
        movieId?: string;
        mediaType?: MediaType;
        body: string;
        spoiler?: boolean;
      }[]>(),
    // `movies` narrows to the three fields needed for the entry count and the
    // first poster, so a 500-title list does not transfer in full.
    MovieList.find({ "movies.movieId": movieId, "movies.mediaType": mediaEquals(mediaType), ...publiclyVisible() })
      .select("_id userEmail userName title description movies.movieId movies.title movies.posterPath")
      .sort({ createdAt: -1 })
      .limit(4)
      .lean<{
        _id: { toString: () => string };
        userName: string;
        userEmail: string;
        title: string;
        description?: string;
        movies: { movieId: string; title: string; posterPath?: string | null }[];
      }[]>(),
  ]);

  // One lookup for the bylines across both collections, rather than a read per
  // review and per list.
  const usernames = await buildUsernameMap([
    ...publicReviews.map((review) => review.userEmail),
    ...publicLists.map((list) => list.userEmail),
  ]);

  const ratingMaps = await buildReviewerRatingMaps(
    publicReviews.map((review) => ({
      userEmail: review.userEmail,
      movieId: review.movieId,
      mediaType: review.mediaType,
    }))
  );

  if (publicReviews.length === 0 && publicLists.length === 0) {
    return null;
  }

  const reviewPath = mediaHref(mediaType, movieId);

  return (
    <section className="mt-14 grid gap-6 border-t border-rule pt-8 lg:grid-cols-2">
      <div>
        <h2 className="font-display mb-5 text-2xl font-medium leading-tight text-content">Reviews</h2>
        {publicReviews.length > 0 ? (
          <div className="space-y-3">
            {publicReviews.map((review) => {
              const reviewRating = lookupRating(ratingMaps, {
                userEmail: review.userEmail,
                movieId: review.movieId,
                mediaType: review.mediaType,
              });
              return (
                <article key={review._id.toString()} className="rounded-sheet border border-rule bg-surface-raised/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-content-muted">
                      by{" "}
                      <UserNameLink
                        userName={review.userName}
                        username={usernameFor(usernames, review.userEmail)}
                      />
                    </p>
                    {reviewRating > 0 && (
                      <span className="text-sm font-bold text-highlight">{starsLabel(reviewRating)} stars</span>
                    )}
                  </div>
                  {review.spoiler && (
                    <span className="mt-2 inline-flex rounded-full border border-highlight/20 bg-highlight/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-highlight">
                      Spoiler
                    </span>
                  )}
                  {review.spoiler ? (
                    <SpoilerText text={review.body} />
                  ) : (
                    <p className="mt-3 line-clamp-4 text-sm leading-6 text-content">
                      {renderRichText(review.body)}
                    </p>
                  )}
                  <CommentSection
                    parentType="review"
                    parentId={review._id.toString()}
                    path={reviewPath}
                  />
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState title="No public reviews yet" description="Be the first to review this." />
        )}
      </div>

      <div>
        <h2 className="font-display mb-5 text-2xl font-medium leading-tight text-content">In Lists</h2>
        {publicLists.length > 0 ? (
          <div className="space-y-3">
            {publicLists.map((list) => (
              // The card is a container, not a link. Wrapping the whole thing in
              // a <Link> made the byline un-linkable -- an anchor inside an
              // anchor is invalid HTML and unreachable by keyboard -- so the
              // title carries the navigation instead, which is what
              // `app/(root)/lists/page.tsx` already does.
              <article
                key={list._id.toString()}
                className="rounded-sheet border border-rule bg-surface-raised/50 p-4 transition hover:border-accent/40"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-bold">
                    <Link
                      href={`/lists/${list._id}`}
                      className="kin-focus rounded-sm transition-colors hover:text-highlight"
                    >
                      {list.title}
                    </Link>
                  </h3>
                  <span className="text-xs text-content-subtle">{list.movies.length} films</span>
                </div>
                <p className="mt-1 text-xs text-content-subtle">
                  by{" "}
                  <UserNameLink
                    userName={list.userName}
                    username={usernameFor(usernames, list.userEmail)}
                  />
                </p>
                {list.description && <p className="mt-3 line-clamp-2 text-sm leading-6 text-content">{list.description}</p>}
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="Not in any lists yet" description="No public lists include this title." />
        )}
      </div>
    </section>
  );
}
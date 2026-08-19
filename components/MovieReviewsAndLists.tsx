import Link from "next/link";
import dbConnect from "@/lib/dbConnect";
import MovieList from "@/models/MovieList";
import Review from "@/models/Review";
import { mediaMatch, mediaEquals } from "@/lib/media";
import { buildReviewerRatingMaps, lookupRating } from "@/lib/reviewRatings";
import { renderRichText } from "@/lib/renderRichText";
import type { MediaType } from "@/types";
import EmptyState from "@/components/EmptyState";
import CommentSection from "@/components/CommentSection";

export default async function MovieReviewsAndLists({
  movieId,
  mediaType = "movie",
}: {
  movieId: string;
  mediaType?: "movie" | "tv";
}) {
  await dbConnect();
  const [publicReviews, publicLists] = await Promise.all([
    Review.find({ movieId, ...mediaMatch(mediaType), visibility: "public" })
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
        createdAt: Date;
      }[]>(),
    MovieList.find({ "movies.movieId": movieId, "movies.mediaType": mediaEquals(mediaType), visibility: "public" })
      .sort({ createdAt: -1 })
      .limit(4)
      .lean<{
        _id: { toString: () => string };
        userName: string;
        title: string;
        description?: string;
        movies: unknown[];
      }[]>(),
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

  const reviewPath = mediaType === "tv" ? `/tv/${movieId}` : `/movie/${movieId}`;

  return (
    <section className="mt-14 grid gap-6 border-t border-white/10 pt-8 lg:grid-cols-2">
      <div>
        <h2 className="mb-5 text-2xl font-bold">Reviews</h2>
        {publicReviews.length > 0 ? (
          <div className="space-y-3">
            {publicReviews.map((review) => {
              const reviewRating = lookupRating(ratingMaps, {
                userEmail: review.userEmail,
                movieId: review.movieId,
                mediaType: review.mediaType,
              });
              return (
                <article key={review._id.toString()} className="rounded-lg border border-white/10 bg-neutral-900/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-neutral-400">by {review.userName}</p>
                    {reviewRating > 0 && (
                      <span className="text-sm font-bold text-yellow-400">{(reviewRating / 2).toFixed(1)} stars</span>
                    )}
                  </div>
                  {review.spoiler && (
                    <span className="mt-2 inline-flex rounded-full border border-yellow-500/20 bg-yellow-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-yellow-300">
                      Spoiler
                    </span>
                  )}
                  <p className={`mt-3 line-clamp-4 text-sm leading-6 text-neutral-300 ${review.spoiler ? "select-none opacity-40 blur-sm" : ""}`}>
                    {review.spoiler ? review.body : renderRichText(review.body)}
                  </p>
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
        <h2 className="mb-5 text-2xl font-bold">In Lists</h2>
        {publicLists.length > 0 ? (
          <div className="space-y-3">
            {publicLists.map((list) => (
              <Link key={list._id.toString()} href={`/lists/${list._id}`} className="block rounded-lg border border-white/10 bg-neutral-900/50 p-4 transition hover:border-red-500/40">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-bold">{list.title}</h3>
                  <span className="text-xs text-neutral-500">{list.movies.length} films</span>
                </div>
                <p className="mt-1 text-xs text-neutral-500">by {list.userName}</p>
                {list.description && <p className="mt-3 line-clamp-2 text-sm text-neutral-300">{list.description}</p>}
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="Not in any lists yet" description="No public lists include this title." />
        )}
      </div>
    </section>
  );
}
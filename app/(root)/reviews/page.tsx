import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";
import type { Metadata } from "next";
import { auth } from "@/auth";
import EmptyState from "@/components/EmptyState";
import dbConnect from "@/lib/dbConnect";
import { buildReviewerRatingMaps, dedupeFavorites, lookupRating } from "@/lib/reviewRatings";
import Review from "@/models/Review";
import User from "@/models/User";
import { createReview } from "./actions";
import type { FavoriteMovie, ReviewItem } from "@/types";
import SubmitButton from "@/components/SubmitButton";
import ReviewCard from "@/components/ReviewCard";

type RawReview = Omit<ReviewItem, "_id" | "createdAt"> & {
  _id: { toString: () => string };
  createdAt: Date;
};

function serializeReview(review: RawReview): ReviewItem {
  return {
    _id: review._id.toString(),
    userEmail: review.userEmail,
    userName: review.userName,
    movieTitle: review.movieTitle,
    posterPath: review.posterPath,
    body: review.body,
    visibility: review.visibility || "public",
    spoiler: Boolean(review.spoiler),
    movieId: review.movieId,
    mediaType: review.mediaType,
    likedBy: review.likedBy || [],
    savedBy: review.savedBy || [],
    createdAt: review.createdAt.toISOString(),
  };
}

export const metadata: Metadata = {
  title: "Reviews",
  description: "Share quick reactions and longer takes on the films and shows you watch.",
};

export default async function ReviewsPage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }
  const currentUserEmail = session.user.email;

  await dbConnect();

  const rawReviews = await Review.find({
    $or: [
      { visibility: "public" },
      { visibility: { $exists: false } },
      { userEmail: currentUserEmail },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(24)
    .lean<RawReview[]>();
  const reviews = rawReviews.map(serializeReview);
  const ratingMaps = await buildReviewerRatingMaps(reviews);

  const user = await User.findOne({ email: currentUserEmail }).lean<{
    favorites?: FavoriteMovie[];
  } | null>();
  const favorites = dedupeFavorites((user?.favorites || []) as FavoriteMovie[]);
  const ratedFavorites = favorites.filter((movie) => (movie.personalRating || 0) > 0);

  return (
    <div className="min-h-screen bg-neutral-950 text-white px-6 py-12">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10">
          <div>
            <p className="text-red-500 text-sm font-bold uppercase tracking-widest mb-3">
              Community
            </p>
            <h1 className="text-4xl md:text-5xl font-bold">Recent Reviews</h1>
            <p className="text-neutral-400 mt-3 max-w-2xl">
              Share quick reactions, longer takes, and the ratings behind your favorite films.
            </p>
          </div>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8">
          <aside className="bg-neutral-900/50 border border-white/10 rounded-xl p-5 h-fit">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <MessageSquare className="w-5 h-5 text-red-400" />
              </div>
              <h2 className="font-bold text-lg">Write a Review</h2>
            </div>

            {ratedFavorites.length > 0 ? (
              <form action={createReview} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                      Pick a rated movie
                    </label>
                    <select
                      name="favoriteMovieId"
                      required
                      className="w-full bg-neutral-950 border border-white/10 rounded-lg px-3 py-3 text-sm text-white focus:outline-none focus:border-red-500"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Choose a rated movie
                      </option>
                      {ratedFavorites.map((movie) => (
                        <option key={`${movie.mediaType || "movie"}-${movie.movieId}`} value={`${movie.mediaType || "movie"}:${movie.movieId}`}>
                          {movie.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                      Review
                    </label>
                    <textarea
                      name="body"
                      required
                      maxLength={1200}
                      rows={6}
                      placeholder="What stayed with you?"
                      className="w-full bg-neutral-950 border border-white/10 rounded-lg px-3 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-red-500 resize-none"
                    />
                  </div>

                  <fieldset>
                    <legend className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                      Visibility
                    </legend>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex items-center gap-2 bg-neutral-950 border border-white/10 rounded-lg px-3 py-3 text-sm cursor-pointer hover:border-red-500/50">
                        <input
                          type="radio"
                          name="visibility"
                          value="public"
                          defaultChecked
                          className="accent-red-600"
                        />
                        Public
                      </label>
                      <label className="flex items-center gap-2 bg-neutral-950 border border-white/10 rounded-lg px-3 py-3 text-sm cursor-pointer hover:border-red-500/50">
                        <input
                          type="radio"
                          name="visibility"
                          value="private"
                          className="accent-red-600"
                        />
                        Private
                      </label>
                    </div>
                  </fieldset>

                  <label className="flex items-center gap-2 bg-neutral-950 border border-white/10 rounded-lg px-3 py-3 text-sm cursor-pointer hover:border-red-500/50">
                    <input type="checkbox" name="spoiler" className="accent-red-600" />
                    Contains spoilers
                  </label>

                  <SubmitButton pendingLabel="Publishing..." className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg transition">
                    Publish Review
                  </SubmitButton>
              </form>
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 bg-neutral-950/70 p-6 text-center">
<p className="mb-2 text-sm text-neutral-400">
                  Your rating lives on each movie page &mdash; tap the stars to rate, then come back here to review it.
                </p>
                <Link href="/" className="text-red-500 hover:text-red-400 text-sm hover:underline">
                  Browse movies to rate
                </Link>
              </div>
            )}
          </aside>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {reviews.length > 0 ? (
              reviews.map((review) => (
                <ReviewCard
                  key={review._id}
                  review={review}
                  rating={lookupRating(ratingMaps, review)}
                  currentUserEmail={currentUserEmail}
                  path="/reviews"
                />
              ))
            ) : (
              <div className="md:col-span-2">
                <EmptyState
                  title="No reviews yet"
                  description="Be the first to publish a review."
                />
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

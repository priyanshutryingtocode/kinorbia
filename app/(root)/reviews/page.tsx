import Image from "next/image";
import Link from "next/link";
import { MessageSquare, Star } from "lucide-react";
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import Review from "@/models/Review";
import User from "@/models/User";
import { createReview } from "./actions";
import type { FavoriteMovie, ReviewItem } from "@/types";

type RawReview = Omit<ReviewItem, "_id" | "createdAt"> & {
  _id: { toString: () => string };
  createdAt: Date;
};

function serializeReview(review: RawReview): ReviewItem {
  return {
    _id: review._id.toString(),
    userName: review.userName,
    movieTitle: review.movieTitle,
    posterPath: review.posterPath,
    rating: review.rating,
    body: review.body,
    createdAt: review.createdAt.toISOString(),
  };
}

function posterUrl(path?: string | null) {
  return path ? `https://image.tmdb.org/t/p/w342${path}` : null;
}

export default async function ReviewsPage() {
  const session = await auth();
  await dbConnect();

  const rawReviews = await Review.find({})
    .sort({ createdAt: -1 })
    .limit(24)
    .lean<RawReview[]>();
  const reviews = rawReviews.map(serializeReview);

  const user = session?.user?.email
    ? await User.findOne({ email: session.user.email })
    : null;
  const favorites = (user?.favorites || []) as FavoriteMovie[];

  return (
    <div className="min-h-screen bg-neutral-950 text-white px-6 py-12">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10">
          <div>
            <p className="text-red-500 text-sm font-bold uppercase tracking-widest mb-3">
              Community
            </p>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tighter">Recent Reviews</h1>
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

            {session?.user ? (
              <form action={createReview} className="space-y-4">
                {favorites.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                      Pick from Favorites
                    </label>
                    <select
                      name="favoriteMovieId"
                      className="w-full bg-neutral-950 border border-white/10 rounded-lg px-3 py-3 text-sm text-white focus:outline-none focus:border-red-500"
                      defaultValue=""
                    >
                      <option value="">Manual movie title</option>
                      {favorites.map((movie) => (
                        <option key={movie.movieId} value={movie.movieId}>
                          {movie.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                    Movie Title
                  </label>
                  <input
                    name="movieTitle"
                    placeholder="For manual reviews"
                    className="w-full bg-neutral-950 border border-white/10 rounded-lg px-3 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                    Rating
                  </label>
                  <input
                    name="rating"
                    type="number"
                    min="1"
                    max="10"
                    required
                    placeholder="8"
                    className="w-full bg-neutral-950 border border-white/10 rounded-lg px-3 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-red-500"
                  />
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

                <button className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg transition">
                  Publish Review
                </button>
              </form>
            ) : (
              <div className="text-sm text-neutral-400">
                <p className="mb-4">Sign in to publish reviews and build your film voice.</p>
                <Link href="/login" className="text-red-400 hover:text-red-300 font-medium">
                  Sign in
                </Link>
              </div>
            )}
          </aside>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {reviews.length > 0 ? (
              reviews.map((review) => (
                <article
                  key={review._id}
                  className="bg-neutral-900/50 border border-white/10 rounded-xl overflow-hidden flex"
                >
                  <div className="relative w-24 sm:w-32 shrink-0 bg-neutral-900">
                    {posterUrl(review.posterPath) ? (
                      <Image
                        src={posterUrl(review.posterPath) as string}
                        alt={review.movieTitle}
                        fill
                        sizes="128px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-neutral-700">
                        <MessageSquare className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <div className="p-5 min-w-0">
                    <div className="flex items-center gap-2 text-yellow-400 text-sm font-bold mb-2">
                      <Star className="w-4 h-4 fill-current" />
                      {review.rating}/10
                    </div>
                    <h3 className="text-lg font-bold text-white truncate">{review.movieTitle}</h3>
                    <p className="text-xs text-neutral-500 mt-1">
                      by {review.userName} · {new Date(review.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-neutral-300 leading-relaxed mt-4 line-clamp-5">
                      {review.body}
                    </p>
                  </div>
                </article>
              ))
            ) : (
              <div className="md:col-span-2 border border-dashed border-white/10 rounded-xl p-10 text-center text-neutral-500">
                No reviews yet. Be the first to publish one.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

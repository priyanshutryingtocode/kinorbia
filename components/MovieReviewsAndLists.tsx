import Link from "next/link";
import dbConnect from "@/lib/dbConnect";
import MovieList from "@/models/MovieList";
import Review from "@/models/Review";
import { mediaMatch, mediaEquals } from "@/lib/media";

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
        rating: number;
        body: string;
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

  if (publicReviews.length === 0 && publicLists.length === 0) {
    return null;
  }

  return (
    <section className="mt-14 grid gap-6 border-t border-white/10 pt-8 lg:grid-cols-2">
      <div>
        <h2 className="mb-5 text-2xl font-bold">Reviews</h2>
        {publicReviews.length > 0 ? (
          <div className="space-y-3">
            {publicReviews.map((review) => (
              <article key={review._id.toString()} className="rounded-lg border border-white/10 bg-neutral-900/50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-neutral-400">by {review.userName}</p>
                  <span className="text-sm font-bold text-yellow-400">{(review.rating / 2).toFixed(1)} stars</span>
                </div>
                <p className="mt-3 line-clamp-4 text-sm leading-6 text-neutral-300">{review.body}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-neutral-500">No public reviews yet.</div>
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
          <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-neutral-500">No public lists include this yet.</div>
        )}
      </div>
    </section>
  );
}
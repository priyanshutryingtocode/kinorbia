import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import MovieCard, { type MovieProp } from "@/components/MovieCard";
import type { FavoriteMovie } from "@/types";
import { getRecommendationMovies, getTvRecommendations } from "@/lib/tmdb";

async function fetchRecommendations(movie: FavoriteMovie): Promise<MovieProp[]> {
  if (movie.mediaType === "tv") {
    const data = await getTvRecommendations(movie.movieId);
    return data?.results || [];
  }
  const data = await getRecommendationMovies(movie.movieId);
  return data?.results || [];
}

export default async function Recommendations() {
  const session = await auth();
  if (!session?.user?.email) return null;

  await dbConnect();
  const user = await User.findOne({ email: session.user.email }).lean<{ favorites?: FavoriteMovie[] } | null>();
  const favorite = user?.favorites?.at(-1);
  if (!favorite) return null;

  const recommendations = (await fetchRecommendations(favorite)).slice(0, 5);
  if (recommendations.length === 0) return null;

  return (
    <section className="mb-14 border-b border-white/5 pb-10">
      <div className="mb-6 flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">
          Recommended
        </p>
        <h2 className="font-display text-3xl font-bold leading-tight text-white md:text-4xl">
          Because you liked <span className="italic font-normal text-neutral-200">{favorite.title}</span>
        </h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
        {recommendations.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>
    </section>
  );
}

import MovieCard, { MovieProp } from "@/components/MovieCard";
import LoadMore from "@/components/LoadMore";
import GenreFilter from "@/components/GenreFilter";
import { fetchMovies } from "../actions";
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import EmptyState from "@/components/EmptyState";
import RetryButton from "@/components/RetryButton";
import { getRecommendationMovies, getTvRecommendations } from "@/lib/tmdb";
import type { FavoriteMovie } from "@/types";

async function fetchRecommendations(movie: FavoriteMovie): Promise<MovieProp[]> {
  if (movie.mediaType === "tv") {
    const data = await getTvRecommendations(movie.movieId);
    return data?.results || [];
  }
  const data = await getRecommendationMovies(movie.movieId);
  return data?.results || [];
}

type Props = {
  searchParams: Promise<{ genre?: string }>;
};

export default async function Home({ searchParams }: Props) {
  const { genre } = await searchParams;

  const session = await auth();
  
  const movies: MovieProp[] = await fetchMovies(1, genre);
  
  let recommendations: MovieProp[] = [];
  let recommendationSource = "";

  if (session?.user?.email) {
    await dbConnect();
    const user = await User.findOne({ email: session.user.email }).lean<{
      favorites?: FavoriteMovie[];
    } | null>();
    const favorite = user?.favorites?.at(-1);

    if (favorite) {
      recommendationSource = favorite.title;
      recommendations = (await fetchRecommendations(favorite)).slice(0, 5);
    }
  }

  return (
    <main className="min-h-screen px-6 pt-24 pb-20">
      <div className="max-w-7xl mx-auto">
        
        {!genre && recommendations.length > 0 && (
          <section className="mb-14">
            <div className="mb-6 flex flex-col gap-2">
              <p className="text-sm font-bold uppercase tracking-widest text-red-400">
                Recommended
              </p>
              <h2 className="text-3xl font-bold text-white md:text-4xl">
                Because you liked {recommendationSource}
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              {recommendations.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>
          </section>
        )}
        
        <div className="mb-8 max-w-3xl">
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-red-400">
            KinOrbia Picks
          </p>
          <h1 className="mb-3 text-4xl font-bold text-white md:text-5xl">
            {genre ? "Discover" : "Popular"} <span className="text-red-500">Now</span>
          </h1>
          <p className="text-base leading-7 text-neutral-400">
            {genre ? "Explore movies in your selected genre." : "Trending movies from around the globe."}
          </p>
        </div>

        <GenreFilter />

        {movies.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {movies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Couldn't load movies right now"
            description="Popular movies are temporarily unavailable. Refresh to try again."
          >
            <RetryButton />
          </EmptyState>
        )}

        {movies.length > 0 && <LoadMore key={genre || "all"} genre={genre} />}

      </div>
    </main>
  );
}

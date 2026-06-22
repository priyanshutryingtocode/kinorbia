import MovieCard, { MovieProp } from "@/components/MovieCard";
import LoadMore from "@/components/LoadMore";
import { fetchMovies } from "../actions";
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import type { FavoriteMovie } from "@/types";

type RecommendationResponse = {
  results?: MovieProp[];
};

async function fetchRecommendations(movieId: string): Promise<MovieProp[]> {
  const res = await fetch(
    `https://api.themoviedb.org/3/movie/${movieId}/recommendations?api_key=${process.env.TMDB_API_KEY}&language=en-US&page=1`,
    { next: { revalidate: 3600 } }
  );

  if (!res.ok) {
    return [];
  }

  const data = (await res.json()) as RecommendationResponse;
  return data.results || [];
}

export default async function Home() {
  const session = await auth();
  const movies: MovieProp[] = await fetchMovies(1);
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
      recommendations = (await fetchRecommendations(favorite.movieId)).slice(0, 5);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 pt-24 px-6 pb-20">
      <div className="max-w-7xl mx-auto">
        {recommendations.length > 0 && (
          <section className="mb-14">
            <div className="mb-6">
              <p className="text-red-500 text-sm font-bold uppercase tracking-widest mb-2">
                Recommended
              </p>
              <h2 className="text-3xl font-bold text-white tracking-tighter">
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
        
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white tracking-tighter mb-2">
            Popular <span className="text-red-600">Now</span>
          </h1>
          <p className="text-neutral-400">Trending movies from around the globe.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {movies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>

        <LoadMore />

      </div>
    </main>
  );
}

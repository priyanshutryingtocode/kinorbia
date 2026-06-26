import MovieCard, { MovieProp } from "@/components/MovieCard";
import LoadMore from "@/components/LoadMore";
import GenreFilter from "@/components/GenreFilter";
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

type Props = {
  searchParams: Promise<{ genre?: string }>;
};

export default async function Home({ searchParams }: Props) {
  // 1. Await search params for Next.js 15 compatibility
  const { genre } = await searchParams;

  const session = await auth();
  
  // 2. Pass the genre to your fetch action
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
      recommendations = (await fetchRecommendations(favorite.movieId)).slice(0, 5);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 pt-24 px-6 pb-20">
      <div className="max-w-7xl mx-auto">
        
        {/* Only show personalized recommendations if NO genre is selected */}
        {!genre && recommendations.length > 0 && (
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
        
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white tracking-tighter mb-2">
            {genre ? "Discover" : "Popular"} <span className="text-red-600">Now</span>
          </h1>
          <p className="text-neutral-400">
            {genre ? "Explore movies in your selected genre." : "Trending movies from around the globe."}
          </p>
        </div>

        {/* 3. Insert the Genre Filter Component */}
        <GenreFilter />

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {movies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>

        {/* 4. Pass the genre to LoadMore so infinite scroll loads the correct category */}
        <LoadMore key={genre || "all"} genre={genre} />

      </div>
    </main>
  );
}
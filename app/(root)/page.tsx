import MovieCard, { MovieProp } from "@/components/MovieCard";
import LoadMore from "@/components/LoadMore";
import { fetchMovies } from "../actions"; // Re-use the action for initial load

export default async function Home() {
  // 1. Fetch Page 1 on the server (Instant load)
  const movies: MovieProp[] = await fetchMovies(1);

  return (
    <main className="min-h-screen bg-neutral-950 pt-24 px-6 pb-20">
      <div className="max-w-7xl mx-auto">
        
        {/* Hero / Header Section */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white tracking-tighter mb-2">
            Popular <span className="text-red-600">Now</span>
          </h1>
          <p className="text-neutral-400">Trending movies from around the globe.</p>
        </div>

        {/* 2. Initial Grid (Page 1) */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {movies.map((movie, index) => (
            <MovieCard key={movie.id} movie={movie} index={index} />
          ))}
        </div>

        {/* 3. The Infinite Scroll Trigger */}
        <LoadMore />

      </div>
    </main>
  );
}
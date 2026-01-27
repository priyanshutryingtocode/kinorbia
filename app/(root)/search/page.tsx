import Link from "next/link";
import { Film } from "lucide-react";

async function searchMovies(query: string) {
  const res = await fetch(
    `https://api.themoviedb.org/3/search/movie?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(query)}`
  );
  if (!res.ok) throw new Error("Failed to search");
  return res.json();
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q: string }>;
}) {
  const { q } = await searchParams; // Next.js 15 requires awaiting params
  const data = await searchMovies(q || "");
  const movies = data.results || [];

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-10">
      <h1 className="text-3xl font-bold mb-8">
        Results for "<span className="text-red-500">{q}</span>"
      </h1>

      {movies.length === 0 ? (
        <p className="text-neutral-400">No movies found.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {movies.map((movie: any) => (
            <Link
              key={movie.id}
              href={`/movie/${movie.id}`}
              className="group relative block"
            >
              {movie.poster_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                  alt={movie.title}
                  className="rounded-lg shadow-lg group-hover:opacity-75 transition"
                />
              ) : (
                <div className="h-75 bg-neutral-800 rounded-lg flex items-center justify-center">
                  <Film className="text-neutral-600" />
                </div>
              )}
              <p className="mt-2 text-sm font-medium truncate group-hover:text-red-500 transition-colors">
                {movie.title}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
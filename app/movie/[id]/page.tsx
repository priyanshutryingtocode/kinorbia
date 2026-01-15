import { Film } from "lucide-react";
import Link from "next/link"; 

async function getTrendingMovies() {
  const res = await fetch(
    `https://api.themoviedb.org/3/trending/movie/day?api_key=${process.env.TMDB_API_KEY}`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) throw new Error("Failed to fetch data");
  return res.json();
}

export default async function Home() {
  const data = await getTrendingMovies();
  const movies = data.results.slice(0, 10);

  return (
    <main className="min-h-screen bg-neutral-950 text-white p-10">
      <header className="flex items-center gap-2 mb-8">
        <Film className="text-red-500 w-8 h-8" />
        <h1 className="text-4xl font-bold tracking-tighter">KinOrbia</h1>
      </header>

      <section>
        <h2 className="text-xl font-semibold mb-4 text-neutral-400">Trending Now</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {movies.map((movie: any) => (
            /* 2. Wrap the Movie Card in a Link */
            <Link 
              href={`/movie/${movie.id}`} 
              key={movie.id} 
              className="group relative block z-10" // Added 'block' to ensure it behaves like a div
            >
              <img
                src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                alt={movie.title}
                className="rounded-lg shadow-lg group-hover:opacity-75 transition"
              />
              <p className="mt-2 text-sm font-medium truncate group-hover:text-red-500 transition-colors">
                {movie.title}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
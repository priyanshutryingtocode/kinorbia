import MovieCarousel, { CarouselMovie } from "./MovieCarousel";

interface SimilarMoviesProps {
  movieId: string;
}

export default async function SimilarMovies({ movieId }: SimilarMoviesProps) {
  const res = await fetch(
    `https://api.themoviedb.org/3/movie/${movieId}/recommendations?api_key=${process.env.TMDB_API_KEY}&language=en-US&page=1`,
    { next: { revalidate: 86400 } }
  );

  if (!res.ok) return null;

  const data = await res.json();
  const movies: CarouselMovie[] = data.results.slice(0, 15); 

  if (movies.length === 0) return null;

  return (
    <section className="mt-16 border-t border-white/10 pt-10 px-4 md:px-0">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-6 bg-red-600 rounded-full shadow-[0_0_10px_rgba(220,38,38,0.8)]"></div>
        <h2 className="text-2xl font-bold text-white tracking-wide">More Like This</h2>
      </div>

      <MovieCarousel movies={movies} />
    </section>
  );
}
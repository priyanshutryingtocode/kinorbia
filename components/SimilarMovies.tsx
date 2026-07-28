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
    <section className="mt-14 border-t border-white/10 pt-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-white">More Like This</h2>
      </div>

      <MovieCarousel movies={movies} />
    </section>
  );
}

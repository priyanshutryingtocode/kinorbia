import MovieCarousel, { CarouselMovie } from "./MovieCarousel";
import { getRecommendationMovies, getTvRecommendations } from "@/lib/tmdb";
import type { MediaType } from "@/types";

interface SimilarMediaProps {
  id: string;
  mediaType: MediaType;
}

export default async function SimilarMedia({ id, mediaType }: SimilarMediaProps) {
  const data =
    mediaType === "tv" ? await getTvRecommendations(id) : await getRecommendationMovies(id);

  if (!data?.results?.length) {
    return null;
  }

  const movies = data.results.slice(0, 15) as CarouselMovie[];

  return (
    <section className="mt-14 border-t border-white/10 pt-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-white">More Like This</h2>
      </div>

      <MovieCarousel movies={movies} />
    </section>
  );
}

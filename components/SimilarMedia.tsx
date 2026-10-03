import MovieCarousel, { CarouselMovie } from "./MovieCarousel";
import { getRecommendations } from "@/lib/tmdb";
import type { MediaType } from "@/types";

interface SimilarMediaProps {
  id: string;
  mediaType: MediaType;
}

export default async function SimilarMedia({ id, mediaType }: SimilarMediaProps) {
  const data = await getRecommendations(id, mediaType);

  if (!data?.results?.length) {
    return null;
  }

  const movies = data.results.slice(0, 15) as CarouselMovie[];

  return (
    <section className="mt-14 border-t border-rule pt-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="font-display text-2xl font-medium leading-tight text-content">More Like This</h2>
      </div>

      <MovieCarousel movies={movies} />
    </section>
  );
}

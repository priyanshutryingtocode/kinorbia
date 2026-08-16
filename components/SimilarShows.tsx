import MovieCarousel, { CarouselMovie } from "./MovieCarousel";
import { getTvRecommendations } from "@/lib/tmdb";

interface SimilarShowsProps {
  showId: string;
}

export default async function SimilarShows({ showId }: SimilarShowsProps) {
  const data = await getTvRecommendations(showId);

  if (!data?.results?.length) {
    return null;
  }

  const shows = data.results.slice(0, 15) as CarouselMovie[];

  return (
    <section className="mt-14 border-t border-white/10 pt-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-white">More Like This</h2>
      </div>

      <MovieCarousel movies={shows} />
    </section>
  );
}
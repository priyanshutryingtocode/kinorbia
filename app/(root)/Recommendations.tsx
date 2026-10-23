import { auth } from "@/auth";
import { getLatestFavoriteOfType } from "@/features/media/queries";
import MovieCard, { type MovieProp } from "@/components/MovieCard";
import { getRecommendations } from "@/lib/tmdb";
import type { MediaType } from "@/types";


export default async function Recommendations({ mediaType }: { mediaType: MediaType }) {
  const session = await auth();
  if (!session?.user?.email) return null;
  const favorite = await getLatestFavoriteOfType(session.user.email, mediaType);
  if (!favorite) return null;

  const data = await getRecommendations(favorite.movieId, mediaType);

  const recommendations: MovieProp[] = (data?.results || []).slice(0, 5);
  if (recommendations.length === 0) return null;

  return (
    <section className="mb-10 border-t border-rule pt-8">
      <div className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="kin-overline text-highlight">Recommended</h2>
        <p className="text-sm text-content-subtle">
          because you liked{" "}
          <span className="italic text-content-muted">{favorite.title}</span>
        </p>
      </div>
      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 hide-scrollbar sm:-mx-6 sm:px-6 md:mx-0 md:grid md:grid-cols-5 md:gap-6 md:overflow-visible md:px-0">
        {recommendations.map((movie, index) => (
          <div
            key={movie.id}
            className="w-[44vw] max-w-44 shrink-0 snap-start md:w-auto md:max-w-none"
          >
            <MovieCard movie={movie} loading={index === 0 ? "eager" : undefined} />
          </div>
        ))}
      </div>
    </section>
  );
}

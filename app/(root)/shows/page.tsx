import MovieCard, { MovieProp } from "@/components/MovieCard";
import LoadMore from "@/components/LoadMore";
import GenreFilter from "@/components/GenreFilter";
import EmptyState from "@/components/EmptyState";
import RetryButton from "@/components/RetryButton";
import { fetchTvShows } from "../../actions";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TV Shows",
  description: "Browse popular TV shows across genres on KinOrbia.",
};

type Props = {
  searchParams: Promise<{ genre?: string }>;
};

export default async function Shows({ searchParams }: Props) {
  const { genre } = await searchParams;

  const shows: MovieProp[] = await fetchTvShows(1, genre);

  return (
    <main className="min-h-screen px-6 pt-24 pb-20">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 max-w-3xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-gold">
            KinOrbia Picks
          </p>
          <h1 className="font-display mb-3 text-4xl font-bold leading-[0.95] text-white md:text-5xl">
            Popular <span className="italic font-normal text-red-500">Shows</span>
          </h1>
          <p className="max-w-xl text-base leading-7 text-neutral-400">
            {genre ? "Explore TV shows in your selected genre." : "Trending shows from around the globe — dense, tactile, yours to collect."}
          </p>
          <div className="mt-4 h-px w-12 bg-gold/40" />
        </div>

        <GenreFilter mediaType="tv" />

        {shows.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {shows.map((show) => (
              <MovieCard key={show.id} movie={show} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Couldn't load shows right now"
            description="Popular shows are temporarily unavailable. Refresh to try again."
          >
            <RetryButton />
          </EmptyState>
        )}

        {shows.length > 0 && <LoadMore key={genre || "all"} genre={genre} mediaType="tv" />}
      </div>
    </main>
  );
}
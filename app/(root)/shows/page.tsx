import MovieCard, { MovieProp } from "@/components/MovieCard";
import LoadMore from "@/components/LoadMore";
import TvGenreFilter from "@/components/TvGenreFilter";
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
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-red-400">
            KinOrbia Picks
          </p>
          <h1 className="mb-3 text-4xl font-bold text-white md:text-5xl">
            Popular <span className="text-red-500">Shows</span>
          </h1>
          <p className="text-base leading-7 text-neutral-400">
            {genre ? "Explore TV shows in your selected genre." : "Trending TV shows from around the globe."}
          </p>
        </div>

        <TvGenreFilter />

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {shows.map((show) => (
            <MovieCard key={show.id} movie={show} />
          ))}
        </div>

        <LoadMore key={genre || "all"} genre={genre} mediaType="tv" />
      </div>
    </main>
  );
}
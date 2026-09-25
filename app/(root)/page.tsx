import { Suspense } from "react";
import PageContainer from "@/components/PageContainer";
import MovieCard from "@/components/MovieCard";
import LoadMore from "@/components/LoadMore";
import GenreFilter from "@/components/GenreFilter";
import RecommendationsSkeleton from "@/components/RecommendationsSkeleton";
import Recommendations from "./Recommendations";
import { fetchMovies } from "../actions";
import EmptyState from "@/components/EmptyState";
import RetryButton from "@/components/RetryButton";

type Props = {
  searchParams: Promise<{ genre?: string }>;
};

export default async function Home({ searchParams }: Props) {
  const { genre } = await searchParams;

  const movies = await fetchMovies(1, genre);

  return (
    <div className="pt-10 pb-16">
      <PageContainer width="page">

        {!genre && (
          <Suspense fallback={<RecommendationsSkeleton />}>
            <Recommendations />
          </Suspense>
        )}

        <div className="mb-8 max-w-3xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-overline text-gold">
            KinOrbia Picks
          </p>
          <h1 className="font-display mb-3 text-4xl font-bold leading-editorial text-white md:text-5xl">
            {genre ? "Discover" : "Popular"} <span className="italic font-normal text-red-500">Movies</span>
          </h1>
          <p className="max-w-xl text-base leading-7 text-neutral-400">
            {genre ? "Explore movies in your selected genre." : "Trending films from around the globe"}
          </p>
          <div className="mt-4 h-px w-12 bg-gold/40" />
        </div>

        <GenreFilter mediaType="movie" />

        {movies.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {movies.map((movie, index) => (
              <MovieCard key={movie.id} movie={movie} index={index} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Couldn't load movies right now"
            description="Popular movies are temporarily unavailable. Refresh to try again."
          >
            <RetryButton />
          </EmptyState>
        )}

        {movies.length > 0 && <LoadMore key={genre || "all"} genre={genre} />}

      </PageContainer>
    </div>
  );
}

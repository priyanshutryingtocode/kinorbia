import { Suspense } from "react";
import RouteShell from "@/components/RouteShell";
import MovieGrid from "@/components/MovieGrid";
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

  const { results: movies } = await fetchMovies({ page: 1, genre });

  return (
    <RouteShell spacing="immersive" width="page">

      {/* The page heading comes first. It used to sit below <Recommendations>,
          which emitted an <h2> in the same display serif above the <h1> -- two
          competing headings in one viewport and no hierarchy at all. */}
      <div className="mb-8 max-w-3xl">
        <p className="mb-3 text-xs font-medium uppercase tracking-overline text-highlight">
          KinOrbia Picks
        </p>
        <h1 className="font-display mb-3 text-4xl font-medium leading-editorial text-content md:text-5xl">
          {genre ? "Discover" : "Popular"} <span className="italic font-normal text-accent-hover">Movies</span>
        </h1>
        <p className="max-w-xl text-base leading-7 text-content-muted">
          {genre ? "Explore movies in your selected genre." : "Trending films from around the globe"}
        </p>
      </div>

      {!genre && (
        <Suspense fallback={<RecommendationsSkeleton />}>
          <Recommendations mediaType="movie" />
        </Suspense>
      )}

      <GenreFilter mediaType="movie" />

      {movies.length > 0 ? (
        // One grid rather than a page grid plus a second grid for the button's
        // additions: two grids meant a short row could land mid-page.
        <MovieGrid
          key={genre || "all"}
          initialItems={movies}
          action={fetchMovies}
          args={{ genre }}
        />
      ) : (
        <EmptyState
          title="Couldn't load movies right now"
          description="Popular movies are temporarily unavailable. Refresh to try again."
        >
          <RetryButton />
        </EmptyState>
      )}

    </RouteShell>
  );
}

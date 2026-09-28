import { Suspense } from "react";
import RouteShell from "@/components/RouteShell";
import MovieGrid from "@/components/MovieGrid";
import GenreFilter from "@/components/GenreFilter";
import EmptyState from "@/components/EmptyState";
import RetryButton from "@/components/RetryButton";
import RecommendationsSkeleton from "@/components/RecommendationsSkeleton";
import Recommendations from "../Recommendations";
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

  const { results: shows } = await fetchTvShows({ page: 1, genre });

  return (
    <RouteShell spacing="immersive" width="page">
      {/* Mirrors the movies page. The heading leads and the personalized row
          follows it: it used to sit above, emitting an <h2> in the same
          display serif before the <h1>. Still hidden while a genre filter is
          active, and still streamed so the TMDB call never blocks the shell. */}
      <div className="mb-8 max-w-3xl">
        <p className="mb-3 text-xs font-medium uppercase tracking-overline text-highlight">
          KinOrbia Picks
        </p>
        <h1 className="font-display mb-3 text-4xl font-medium leading-editorial text-content md:text-5xl">
          Popular <span className="italic font-normal text-accent-hover">Shows</span>
        </h1>
        <p className="max-w-xl text-base leading-7 text-content-muted">
          {genre ? "Explore TV shows in your selected genre." : "Trending shows from around the globe"}
        </p>
      </div>

      {!genre && (
        <Suspense fallback={<RecommendationsSkeleton />}>
          <Recommendations mediaType="tv" />
        </Suspense>
      )}

      <GenreFilter mediaType="tv" />

      {shows.length > 0 ? (
        // Mirrors the movies page: one grid, so a short row is the last row of
        // the page rather than one stranded in the middle of it.
        <MovieGrid key={genre || "all"} initialItems={shows} action={fetchTvShows} args={{ genre }} />
      ) : (
        <EmptyState
          title="Couldn't load shows right now"
          description="Popular shows are temporarily unavailable. Refresh to try again."
        >
          <RetryButton />
        </EmptyState>
      )}

    </RouteShell>
  );
}
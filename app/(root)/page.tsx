import type { Metadata } from "next";
import type { MovieSummary } from "@/types";
import EmptyState from "@/components/EmptyState";
import MovieGrid from "@/components/MovieGrid";
import RetryButton from "@/components/RetryButton";
import RouteShell from "@/components/RouteShell";
import TrendingFilter, { type TrendingFilters } from "@/components/TrendingFilter";
import { fetchTrending } from "../actions";

export const metadata: Metadata = {
  title: "Trending",
  description: "What everyone is watching this week.",
};

// Trending is the landing page, so it answers "what's worth watching" before asking anyone
// to pick a shelf. It is the one page on the site that renders identically for a signed-out
// visitor -- nothing here reads the viewer's library.
//
// Genre browsing is a different question and lives at /movies and /shows; the Recommendations
// strip is a third and rides on those pages, because it needs the viewer's own history.

type Props = {
  searchParams: Promise<{ type?: string; window?: string }>;
};

function parseFilters(params: { type?: string; window?: string }): TrendingFilters {
  return {
    // Anything unrecognised falls back to the default rather than erroring: a mistyped
    // query string should still render a usable page.
    mediaType: params.type === "tv" ? "tv" : "movie",
    window: params.window === "day" ? "day" : "week",
  };
}

export default async function TrendingPage({ searchParams }: Props) {
  const filters = parseFilters(await searchParams);
  const { results, nextPage, failed } = await fetchTrending({
    page: 1,
    mediaType: filters.mediaType,
    window: filters.window,
  });

  const noun = filters.mediaType === "tv" ? "shows" : "movies";
  const windowLabel = filters.window === "day" ? "today" : "this week";

  return (
    <RouteShell spacing="immersive" width="page">
      <div className="mb-8 max-w-3xl">
        <p className="mb-3 text-xs font-medium uppercase tracking-overline text-highlight">
          KinOrbia Picks
        </p>
        <h1 className="font-display mb-3 text-4xl font-medium leading-editorial text-content md:text-5xl">
          Trending{" "}
          <span className="italic font-normal text-accent-hover">{windowLabel}</span>
        </h1>
        <p className="max-w-xl text-base leading-7 text-content-muted">
          The most-watched {noun} right now.
        </p>
      </div>

      <TrendingFilter filters={filters} />

      {results.length > 0 ? (
        <MovieGrid
          // Remounts the grid when a filter changes so the previous view's titles and
          // load-more page cursor are discarded rather than appended to.
          key={`${filters.mediaType}-${filters.window}`}
          initialItems={results as MovieSummary[]}
          action={fetchTrending}
          args={{ mediaType: filters.mediaType, window: filters.window }}
          initialPage={nextPage}
        />
      ) : (
        <EmptyState
          title={failed ? "Couldn't load trending right now" : "Nothing trending yet"}
          description={
            failed
              ? "Trending titles are temporarily unavailable. Refresh to try again."
              : "TMDB has no trending titles for this filter right now."
          }
        >
          <RetryButton />
        </EmptyState>
      )}
    </RouteShell>
  );
}
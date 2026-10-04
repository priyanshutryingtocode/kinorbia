import { Suspense } from "react";
import type { MovieSummary } from "@/types";
import type { BrowsePage } from "@/app/actions";
import EmptyState from "@/components/EmptyState";
import GenreFilter from "@/components/GenreFilter";
import MovieGrid from "@/components/MovieGrid";
import Recommendations from "@/app/(root)/Recommendations";
import RecommendationsSkeleton from "@/components/RecommendationsSkeleton";
import RetryButton from "@/components/RetryButton";
import RouteShell from "@/components/RouteShell";


type BrowseAction = (args: {
  page: number;
  genre?: string;
  exclude?: string[];
}) => Promise<BrowsePage>;

export type BrowseCopy = {
  headingNoun: string;
  ledeGenre: string;
  ledeDefault: string;
  emptyTitle: string;
  emptyDescription: string;
};

type BrowseMediaPageProps = {
  mediaType: "movie" | "tv";
  action: BrowseAction;
  copy: BrowseCopy;
  searchParams: Promise<{ genre?: string }>;
};

export default async function BrowseMediaPage({
  mediaType,
  action,
  copy,
  searchParams,
}: BrowseMediaPageProps) {
  const { genre } = await searchParams;

  const { results } = await action({ page: 1, genre });

  return (
    <RouteShell spacing="immersive" width="page">
      <div className="mb-8 max-w-3xl">
        <p className="mb-3 text-xs font-medium uppercase tracking-overline text-highlight">
          KinOrbia Picks
        </p>
        <h1 className="font-display mb-3 text-4xl font-medium leading-editorial text-content md:text-5xl">
          {genre ? "Discover" : "Popular"}{" "}
          <span className="italic font-normal text-accent-hover">{copy.headingNoun}</span>
        </h1>
        <p className="max-w-xl text-base leading-7 text-content-muted">
          {genre ? copy.ledeGenre : copy.ledeDefault}
        </p>
      </div>

      {!genre && (
        <Suspense fallback={<RecommendationsSkeleton />}>
          <Recommendations mediaType={mediaType} />
        </Suspense>
      )}

      <GenreFilter mediaType={mediaType} />

      {results.length > 0 ? (
        <MovieGrid key={genre || "all"} initialItems={results as MovieSummary[]} action={action} args={{ genre }} />
      ) : (
        <EmptyState title={copy.emptyTitle} description={copy.emptyDescription}>
          <RetryButton />
        </EmptyState>
      )}
    </RouteShell>
  );
}
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

// /movies and /shows were the same page written out twice -- 66 and 67 lines
// differing only in imports, metadata, the action, four nouns and four strings
// of copy. Copy-paste like that does not stay in sync, and here it already
// hadn't: the movies page read {genre ? "Discover" : "Popular"} while the shows
// page had a bare "Popular", so the genre-aware heading silently never shipped
// to /shows. Both now come through here.
//
// Everything genuinely shared lives below; only the words differ per media type.

type BrowseAction = (args: {
  page: number;
  genre?: string;
  exclude?: string[];
}) => Promise<BrowsePage>;

export type BrowseCopy = {
  // The accent-coloured noun in the <h1>: "Movies" / "Shows".
  headingNoun: string;
  // Shown once a genre filter is active.
  ledeGenre: string;
  // The default lede.
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
      {/* The page heading comes first. It used to sit below <Recommendations>,
          which emitted an <h2> in the same display serif above the <h1> -- two
          competing headings in one viewport and no hierarchy at all. */}
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

      {/* Hidden while a genre filter is active, and streamed so the TMDB call
          never blocks the shell. */}
      {!genre && (
        <Suspense fallback={<RecommendationsSkeleton />}>
          <Recommendations mediaType={mediaType} />
        </Suspense>
      )}

      <GenreFilter mediaType={mediaType} />

      {results.length > 0 ? (
        // One grid rather than a page grid plus a second grid for the button's
        // additions: two grids meant a short row could land mid-page.
        <MovieGrid key={genre || "all"} initialItems={results as MovieSummary[]} action={action} args={{ genre }} />
      ) : (
        <EmptyState title={copy.emptyTitle} description={copy.emptyDescription}>
          <RetryButton />
        </EmptyState>
      )}
    </RouteShell>
  );
}
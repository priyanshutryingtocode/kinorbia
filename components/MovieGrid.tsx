"use client";

import { useMemo, useState } from "react";
import MovieCard from "@/components/MovieCard";
import SubmitButton from "@/components/SubmitButton";
import { useLoadMore, type LoadMorePage } from "@/lib/useLoadMore";
import { mediaKey } from "@/lib/media";
import type { MovieSummary } from "@/types";

type BrowseArgs = { page: number; genre?: string; exclude?: string[] };

type MovieGridProps = {
  // The page's first 20 titles, already in the RSC payload. The button only
  // appends, so first paint is unaffected.
  initialItems: MovieSummary[];
  // A reference, not a callback: plain functions cannot cross the boundary.
  action: (args: BrowseArgs) => Promise<LoadMorePage<MovieSummary>>;
  args?: { genre?: string };
};

// TMDB ids collide across the movie and TV namespaces, so the media type is
// part of a title's identity -- the same `mediaKey` the rest of the app uses.
const keyOf = (movie: MovieSummary) => mediaKey(movie.mediaType, movie.id);

// One grid for the whole page: the 20 the server rendered and everything the
// button has loaded since. Two grids is what used to put a short row mid-page,
// because a last row is only full when the count divides by the column count.
//
// No de-duplication here on purpose: `loadBrowsePage` already returns only titles
// not on screen, and filtering again would put the total back on the arbitrary
// residue this exists to avoid. See app/actions.ts for why a click must add
// exactly 20.
export default function MovieGrid({
  initialItems,
  action,
  args = {},
}: MovieGridProps) {
  // Seeded once on mount, never read from the prop again. `fetchMovies` is a
  // server action, so a click revalidates the route and re-renders with a *new*
  // `initialItems`; deriving from the prop each render replaced everything with
  // the fresh 20, so the click looked like it had done nothing. A genre change
  // is the one case that wants a new seed, and the call site remounts via
  // `key={genre || "all"}`.
  const [seed] = useState(initialItems);
  const seedKeys = useMemo(() => seed.map(keyOf), [seed]);

  const { items: appended, loading, hasMore, error, loadMore } = useLoadMore(action, args, {
    keyOf,
    seedKeys,
  });

  const items = useMemo(() => [...seed, ...appended], [seed, appended]);

  return (
    <>
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4 lg:grid-cols-5">
        {items.map((movie, index) => (
          <MovieCard key={keyOf(movie)} movie={movie} index={index} />
        ))}
      </div>

      {hasMore && (
        <div className="mt-10 flex flex-col items-center gap-3">
          <SubmitButton
            type="button"
            variant="secondary"
            loading={loading}
            pendingLabel="Loading..."
            onClick={loadMore}
          >
            Load more
          </SubmitButton>
          {error && (
            <p role="alert" className="text-xs text-accent-hover">
              {error}
            </p>
          )}
        </div>
      )}
    </>
  );
}

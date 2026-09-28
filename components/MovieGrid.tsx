"use client";

import { useMemo, useState } from "react";
import MovieCard from "@/components/MovieCard";
import SubmitButton from "@/components/SubmitButton";
import { useLoadMore, type LoadMorePage } from "@/lib/useLoadMore";
import { mediaKey } from "@/lib/media";
import type { MovieSummary } from "@/types";

type BrowseArgs = { page: number; genre?: string; exclude?: string[] };

type MovieGridProps = {
  // The page's first 20 titles, already server-rendered into the RSC payload.
  // The button only ever appends to this list, so the first paint is unchanged
  // and there is no cost to the client boundary.
  initialItems: MovieSummary[];
  // A server action reference, not a callback: plain functions cannot cross the
  // server -> client boundary.
  action: (args: BrowseArgs) => Promise<LoadMorePage<MovieSummary>>;
  args?: { genre?: string };
};

// TMDB ids collide across the movie and TV namespaces, so the media type is
// part of a title's identity -- the same `mediaKey` the rest of the app uses.
const keyOf = (movie: MovieSummary) => mediaKey(movie.mediaType, movie.id);

// One grid for the whole page: the 20 the server rendered and everything the
// button has since loaded.
//
// They used to be two separate grids, which is what put a short row in the
// middle of the page. A grid's last row is only full when the item count divides
// by the column count, and the browse grid is 2, 4 or 5 columns -- so a click has
// to add exactly 20 titles, which is what `loadBrowsePage` guarantees by topping
// up past any titles TMDB has re-ranked into the batch. That is why there is no
// de-duplication here: the action returns only titles not already on screen, and
// filtering them again would put the total back on an arbitrary residue.
export default function MovieGrid({
  initialItems,
  action,
  args = {},
}: MovieGridProps) {
  // Seeded once, on mount, and never read from the prop again. `fetchMovies` is
  // a server action, so clicking it revalidates this route and the page
  // re-renders with a *new* `initialItems` array. Deriving the grid from the prop
  // on every render meant that re-render replaced everything with the fresh 20
  // and the click looked like it had done nothing. A genre change is the one case
  // that genuinely wants a new seed, and the call site's `key={genre || "all"}`
  // remounts this component for it.
  const [seed] = useState(initialItems);
  const seedKeys = useMemo(() => seed.map(keyOf), [seed]);

  const { items: appended, loading, hasMore, loadMore } = useLoadMore(action, args, {
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
        <div className="mt-10 flex justify-center">
          <SubmitButton
            type="button"
            variant="secondary"
            loading={loading}
            pendingLabel="Loading..."
            onClick={loadMore}
          >
            Load more
          </SubmitButton>
        </div>
      )}
    </>
  );
}

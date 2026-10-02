"use client";

import LoadMoreButton from "@/components/LoadMoreButton";
import SearchResultCard from "@/components/SearchResultCard";
import { useLoadMore } from "@/lib/useLoadMore";
import type { SearchFilters, SearchPage } from "@/lib/search";

type SearchLoadMoreProps = {
  action: (args: SearchFilters & { page: number }) => Promise<SearchPage>;
  args: SearchFilters;
};

// Appends another page of search results on demand, matching the movies and
// shows pages so the app has one pagination idiom.
//
// Renders the same `SearchResultCard` as the first page rather than
// `MovieCard`, which would look visibly different from the rows above it.
export default function SearchLoadMore({
  action,
  args,
}: SearchLoadMoreProps) {
  const { items, loading, hasMore, error, loadMore } = useLoadMore(action, args);

  // Deliberately no `items.length === 0` guard here. On the first render
  // `items` is empty and `loading` is false, so such a guard would return null,
  // the button would never render, and `loadMore` could never fire to populate
  // `items` -- permanently dead. The page already covers the empty cases before
  // this component renders (an EmptyState for no filters and for no results),
  // so the button is only ever mounted when results are on screen.
  return (
    <>
      {items.length > 0 && (
        <ul className="mt-5 poster-grid-dense">
          {items.map((movie, index) => (
            <SearchResultCard key={`${movie.mediaType ?? "movie"}-${movie.id}-${index}`} movie={movie} />
          ))}
        </ul>
      )}

      <LoadMoreButton
        loading={loading}
        hasMore={hasMore}
        error={error}
        onLoadMore={loadMore}
        label="Load more results"
      />
    </>
  );
}

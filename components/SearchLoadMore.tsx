"use client";

import LoadMoreButton from "@/components/LoadMoreButton";
import SearchResultCard from "@/components/SearchResultCard";
import { useLoadMore } from "@/lib/useLoadMore";
import type { SearchFilters, SearchPage } from "@/lib/search";

type SearchLoadMoreProps = {
  action: (args: SearchFilters & { page: number }) => Promise<SearchPage>;
  args: SearchFilters;
};

export default function SearchLoadMore({
  action,
  args,
}: SearchLoadMoreProps) {
  const { items, loading, hasMore, error, loadMore } = useLoadMore(action, args);

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

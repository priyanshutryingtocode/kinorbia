"use client";

import { useMemo } from "react";
import LoadMoreButton from "@/components/LoadMoreButton";
import SearchResultCard from "@/components/SearchResultCard";
import { useLoadMore } from "@/lib/useLoadMore";
import { mediaKey } from "@/lib/media";
import type { SearchFilters, SearchPage } from "@/lib/search";
import type { MovieSummary } from "@/types";

type SearchLoadMoreProps = {
  action: (args: SearchFilters & { page: number; exclude?: string[] }) => Promise<SearchPage>;
  args: SearchFilters;
  // The TMDB page the server-rendered batch ended on, and the titles it already showed.
  // One server page can span several TMDB pages now, so the client resumes from `initialPage`
  // and excludes `seed` rather than assuming the next click starts one page further on.
  initialPage: number;
  seed: MovieSummary[];
};

export default function SearchLoadMore({
  action,
  args,
  initialPage,
  seed,
}: SearchLoadMoreProps) {
  const seedKeys = useMemo(() => seed.map((movie) => mediaKey(movie.mediaType, movie.id)), [seed]);

  const { items, loading, hasMore, error, loadMore } = useLoadMore(action, args, {
    keyOf: (movie: MovieSummary) => mediaKey(movie.mediaType, movie.id),
    seedKeys,
    initialPage,
  });

  return (
    <>
      {items.length > 0 && (
        <ul className="mt-5 poster-grid">
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

"use client";

import { useMemo, useState } from "react";
import MovieCard from "@/components/MovieCard";
import LoadMoreButton from "@/components/LoadMoreButton";
import { useLoadMore, type LoadMorePage } from "@/lib/useLoadMore";
import { mediaKey } from "@/lib/media";
import type { MediaType, MovieSummary, TrendingWindow } from "@/types";

type BrowseArgs = {
  page: number;
  genre?: string;
  mediaType?: MediaType;
  window?: TrendingWindow;
  exclude?: string[];
};

type MovieGridProps = {
  initialItems: MovieSummary[];
  action: (args: BrowseArgs) => Promise<LoadMorePage<MovieSummary>>;
  args?: { genre?: string; mediaType?: MediaType; window?: TrendingWindow };
  // Where the server-side batch actually ended. One batch can span several upstream pages
  // (loadBrowsePage fills past posterless titles), so resuming at page 1 would re-request a
  // page already on screen. The exclusion list still makes that harmless, but it costs a
  // TMDB request per load-more to achieve nothing.
  initialPage?: number;
};

const keyOf = (movie: MovieSummary) => mediaKey(movie.mediaType, movie.id);

export default function MovieGrid({
  initialItems,
  action,
  args = {},
  initialPage,
}: MovieGridProps) {
  const [seed] = useState(initialItems);
  const seedKeys = useMemo(() => seed.map(keyOf), [seed]);

  const { items: appended, loading, hasMore, error, loadMore } = useLoadMore(action, args, {
    keyOf,
    seedKeys,
    initialPage,
  });

  const items = useMemo(() => [...seed, ...appended], [seed, appended]);

  return (
    <>
      <div className="poster-grid">
        {items.map((movie, index) => (
          <MovieCard key={keyOf(movie)} movie={movie} index={index} />
        ))}
      </div>

      <LoadMoreButton
        loading={loading}
        hasMore={hasMore}
        error={error}
        onLoadMore={loadMore}
        label="Load more"
      />
    </>
  );
}

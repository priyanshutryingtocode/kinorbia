"use client";

import { useMemo, useState } from "react";
import MovieCard from "@/components/MovieCard";
import LoadMoreButton from "@/components/LoadMoreButton";
import { useLoadMore, type LoadMorePage } from "@/lib/useLoadMore";
import { mediaKey } from "@/lib/media";
import type { MovieSummary } from "@/types";

type BrowseArgs = { page: number; genre?: string; exclude?: string[] };

type MovieGridProps = {

  initialItems: MovieSummary[];
  action: (args: BrowseArgs) => Promise<LoadMorePage<MovieSummary>>;
  args?: { genre?: string };
};

const keyOf = (movie: MovieSummary) => mediaKey(movie.mediaType, movie.id);

export default function MovieGrid({
  initialItems,
  action,
  args = {},
}: MovieGridProps) {
  const [seed] = useState(initialItems);
  const seedKeys = useMemo(() => seed.map(keyOf), [seed]);

  const { items: appended, loading, hasMore, error, loadMore } = useLoadMore(action, args, {
    keyOf,
    seedKeys,
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

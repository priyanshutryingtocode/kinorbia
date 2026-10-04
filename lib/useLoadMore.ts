"use client";

import { useState } from "react";

export type LoadMorePage<T> = { results: T[]; hasMore: boolean; nextPage?: number };

type UseLoadMoreOptions<T> = {
  keyOf?: (item: T) => string;
  seedKeys?: string[];
};

export function useLoadMore<T, TArgs extends { page: number }>(
  action: (args: TArgs) => Promise<LoadMorePage<T>>,
  args: Omit<TArgs, "page">,
  options: UseLoadMoreOptions<T> = {}
) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadMore() {
    if (loading || !hasMore) {
      return;
    }

    setError(null);
    setLoading(true);
    const requested = page + 1;

    try {
      const exclude = options.keyOf
        ? [...(options.seedKeys || []), ...items.map(options.keyOf)]
        : undefined;

      const result = await action({ ...args, ...(exclude && { exclude }), page: requested } as TArgs);

      setItems((previous) => [...previous, ...result.results]);
      setPage(result.nextPage ?? requested);
      setHasMore(result.hasMore);
    } catch (caught) {
      console.error("Failed to load more items:", caught);
      setError("Could not load more titles. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return { items, loading, hasMore, error, loadMore };
}

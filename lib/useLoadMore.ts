"use client";

import { useState } from "react";

// Click-driven pagination, shared by the movies page, the shows page, and
// search results. Takes a server action *reference*, never a callback: a plain
// function cannot cross the server -> client boundary.
//
// `hasMore` reflects whether the *upstream* source has another page, not
// whether this page came back non-empty -- search filters after fetching, so an
// empty page can still have matches further out. `nextPage` is browse-only,
// because its top-up loop reads more than one upstream page per click.
export type LoadMorePage<T> = { results: T[]; hasMore: boolean; nextPage?: number };

type UseLoadMoreOptions<T> = {
  // Identity of an item, for the `exclude` list below. Omitted by search, which
  // has no seed to stay aligned with.
  keyOf?: (item: T) => string;
  // The server-rendered seed this hook does not own.
  seedKeys?: string[];
};

// Generic over the action's own argument shape, so a call site cannot pass an
// `args` object its action would not accept.
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

  // Not memoized on purpose: only ever an onClick handler, and the action and
  // args objects are recreated on every parent render regardless.
  async function loadMore() {
    if (loading || !hasMore) {
      return;
    }

    setError(null);
    setLoading(true);
    const requested = page + 1;

    try {
      // Everything on screen, so a click adds titles not among them. Built here
      // because this hook owns `items` and the caller owns the seed.
      const exclude = options.keyOf
        ? [...(options.seedKeys || []), ...items.map(options.keyOf)]
        : undefined;

      // Safe because `args` is this action's own parameters minus `page`.
      const result = await action({ ...args, ...(exclude && { exclude }), page: requested } as TArgs);

      setItems((previous) => [...previous, ...result.results]);
      // A top-up that read an extra page means `requested + 1` would re-read it.
      setPage(result.nextPage ?? requested);
      setHasMore(result.hasMore);
    } catch (caught) {
      // `page` is left untouched so a retry re-requests the same page.
      console.error("Failed to load more items:", caught);
      setError("Could not load more titles. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return { items, loading, hasMore, error, loadMore };
}

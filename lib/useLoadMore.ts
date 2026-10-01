"use client";

import { useState } from "react";

// Append-a-page pagination, shared by the movies page, the shows page, and
// search results.
//
// The caller passes a server action *reference* plus a serializable args
// object, never a callback: a plain function cannot cross the server -> client
// boundary, so a hook taking `() => fetch(...)` would not compile. A server
// action passed as a prop is the supported form.
//
// Every action resolves to `{ results, hasMore }`, where `hasMore` reflects
// whether the *upstream* source has another page -- not whether this page came
// back non-empty. Search filters results after fetching, so a page can
// legitimately return zero items while matching results exist further out, and
// treating that as the end would strand the user with results still available.
//
// `nextPage` is optional and only the browse actions set it: their top-up loop
// can read more than one upstream page for a single click, so the page to resume
// from is whatever the action reports rather than `page + 1`.
export type LoadMorePage<T> = { results: T[]; hasMore: boolean; nextPage?: number };

type UseLoadMoreOptions<T> = {
  // Identity of an item, used to build the `exclude` list below. Omitted by
  // search, which has no seed and no alignment requirement.
  keyOf?: (item: T) => string;
  // Identifiers already on screen that this hook does not own: the
  // server-rendered seed the caller was mounted with.
  seedKeys?: string[];
};

// Generic over the action's own argument shape, so a call site cannot pass an
// `args` object that does not match what its action expects -- `fetchMovies`
// takes a genre, `fetchSearchPage` takes eight filters, and the hook does not
// care which.
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

  // Not memoized on purpose: this is only ever an onClick handler, so its
  // identity has no effect on rendering, and the action/args objects are
  // recreated on every parent render anyway.
  async function loadMore() {
    if (loading || !hasMore) {
      return;
    }

    setError(null);
    setLoading(true);
    const requested = page + 1;

    try {
      // Everything already on screen, so the action can guarantee a click adds
      // titles that are not among them. Built here rather than by the caller
      // because this hook owns `items`, and a caller that owns a server-rendered
      // seed has to combine the two before it could pass a single value down.
      const exclude = options.keyOf
        ? [...(options.seedKeys || []), ...items.map(options.keyOf)]
        : undefined;

      // Safe because `args` is typed as this action's own parameters minus the
      // page number, which is the only field this adds.
      const result = await action({ ...args, ...(exclude && { exclude }), page: requested } as TArgs);

      setItems((previous) => [...previous, ...result.results]);
      // The action's answer wins when it gives one: a top-up that had to read an
      // extra page means `requested + 1` would re-read it.
      setPage(result.nextPage ?? requested);
      setHasMore(result.hasMore);
    } catch (caught) {
      // Previously logged and swallowed, which made a failed click look exactly
      // like a click that did nothing: the button re-enabled, no items arrived,
      // and nothing on screen said why. `page` is left untouched so retrying
      // asks for the same page rather than skipping it.
      console.error("Failed to load more items:", caught);
      setError("Could not load more titles. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return { items, loading, hasMore, error, loadMore };
}

"use client";

import { useCallback, useRef, useState } from "react";
import type { FeedKind } from "@/lib/feedTypes";

// Cursor paging for the activity feed.
//
// The server hands back an opaque `nextCursor` and there is no page number, so appending is
// a plain cursor walk. Dedupe on the (kind, id) key anyway: the same event can appear twice
// if a member marks something watched between two loads, and a repeated card is the one
// artefact a reader would notice immediately.
type CursorFeedItem = { kind: FeedKind; id: string };

type CursorPage<T extends CursorFeedItem> = {
  results: T[];
  nextCursor: string | null;
};

type UseCursorFeedOptions<T extends CursorFeedItem> = {
  keyOf: (item: T) => string;
  seed: T[];
  seedCursor: string | null;
};

export function useCursorFeed<T extends CursorFeedItem>(
  action: (args: { cursor: string | null }) => Promise<CursorPage<T>>,
  { keyOf, seed, seedCursor }: UseCursorFeedOptions<T>
) {
  const [initial] = useState(seed);
  const [appended, setAppended] = useState<T[]>([]);
  const [cursor, setCursor] = useState(seedCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seen = useRef(new Set(initial.map(keyOf)));
  // Seed and seedCursor both change when the tabs or the signed-in member change, which
  // remounts this component, so the initial value is correct rather than stale.
  const canLoad = cursor !== null;

  const loadMore = useCallback(async () => {
    if (loading || !canLoad) return;

    setError(null);
    setLoading(true);

    try {
      const page = await action({ cursor });
      const fresh = page.results.filter((item) => {
        const key = keyOf(item);
        if (seen.current.has(key)) return false;
        seen.current.add(key);
        return true;
      });

      setAppended((previous) => [...previous, ...fresh]);
      setCursor(page.nextCursor);
    } catch (caught) {
      console.error("Failed to load more activity:", caught);
      setError("Could not load more activity. Try again.");
    } finally {
      setLoading(false);
    }
  }, [action, cursor, canLoad, loading, keyOf]);

  return { items: [...initial, ...appended], loading, hasMore: canLoad, error, loadMore };
}
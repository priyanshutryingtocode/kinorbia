"use client";

import { useCallback, useRef, useState } from "react";
import type { FeedKind } from "@/lib/feedTypes";

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
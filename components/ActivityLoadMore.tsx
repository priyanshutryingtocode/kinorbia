"use client";

import { useCallback } from "react";
import { useCursorFeed } from "@/lib/useCursorFeed";
import ActivityRow from "@/components/ActivityRow";
import type { SerializedFeedRow } from "@/lib/feedTypes";

type Names = Record<string, string>;
type DisplayNames = Record<string, string>;
type Ratings = Record<string, Record<string, number>>;

type AppendedPage = {
  results: SerializedFeedRow[];
  nextCursor: string | null;
  usernames: Names;
  names: DisplayNames;
  ratingMaps: Ratings;
};

type ActivityLoadMoreProps = {
  seed: SerializedFeedRow[];
  seedUsernames: Names;
  seedNames: DisplayNames;
  seedRatingMaps: Ratings;
  seedCursor: string | null;
  isFollowingFeed: boolean;
  fetchPage: (args: { cursor: string | null; isFollowingFeed: boolean }) => Promise<AppendedPage>;
};

// Client half of the feed. The server renders the first page; this appends the rest by
// walking the cursor, so no page number or total appears anywhere in the flow.
export default function ActivityLoadMore({
  seed,
  seedUsernames,
  seedNames,
  seedRatingMaps,
  seedCursor,
  isFollowingFeed,
  fetchPage,
}: ActivityLoadMoreProps) {
  const keyOf = useCallback((item: SerializedFeedRow) => `${item.kind}:${item.id}`, []);

  // Each page carries the usernames and ratings for the people in it, and is kept with its
  // own rows rather than merged into one map: a later page's map only covers its own rows,
  // so a single merged map would be correct but a row still needs the right one for its
  // byline and rating chip.
  const { items, loading, hasMore, error, loadMore } = useCursorFeed<SerializedFeedRow & { usernames: Names; names: DisplayNames; ratingMaps: Ratings }>(
    async ({ cursor }) => {
      const page = await fetchPage({ cursor, isFollowingFeed });
      return {
        results: page.results.map((row) => ({ ...row, usernames: page.usernames, names: page.names, ratingMaps: page.ratingMaps })),
        nextCursor: page.nextCursor,
      };
    },
    { keyOf, seed: [], seedCursor }
  );

  if (seed.length === 0) return null;

  return (
    <>
      <ol className="kin-editorial-list mt-8" aria-label="Activity feed">
        {seed.map((row) => (
          <ActivityRow
            key={keyOf(row)}
            kind={row.kind}
            id={row.id}
            date={row.date}
            data={row.data}
            usernames={seedUsernames}
            names={seedNames}
            ratingMaps={seedRatingMaps}
          />
        ))}
        {items.map((row) => (
          <ActivityRow
            key={keyOf(row)}
            kind={row.kind}
            id={row.id}
            date={row.date}
            data={row.data}
            usernames={row.usernames}
            names={row.names}
            ratingMaps={row.ratingMaps}
          />
        ))}
      </ol>

      {hasMore && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="kin-focus border border-rule bg-surface-raised px-5 py-2.5 text-sm font-semibold text-content transition-colors hover:border-highlight/40 hover:text-highlight disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 text-center text-sm text-danger">
          {error}
        </p>
      )}
    </>
  );
}
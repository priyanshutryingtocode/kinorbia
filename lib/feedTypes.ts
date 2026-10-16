// Wire shape shared between the feed's server query, its client hook and the page.
//
// The feed item unions live in features/activity/queries.ts, but a "use client" module
// cannot import from a "server-only" one -- so the kinds are named here and both sides
// narrow against these. Keeping the discriminant in one file is what stops the client's
// keyOf from drifting from the server'"'"'s `kind` literals.

export type FeedKind = "review" | "list" | "watch";

// One row as it crosses from the server into the client feed.
//
// `data` is deliberately a record of primitives rather than a per-kind shape: ActivityRow
// narrows on `kind` and reads defensively, so this is the boundary contract and not a
// description of what the client understands. What matters is what it *excludes* -- see
// serializeFeedRow, which picks the fields explicitly. A raw Mongo document also satisfies
// Record<string, unknown>, which is how an ObjectId reached a client prop once and broke the
// feed at runtime while tsc stayed silent.
export type SerializedFeedRow = {
  kind: FeedKind;
  id: string;
  date: string;
  data: Record<string, unknown>;
};
// Opaque keyset cursor for the activity feed.
//
// The feed is sorted by (date desc, kind, _id desc) across three collections, and it grows
// while you read it: a member marking something watched mid-scroll shifts every row after
// it. Offset pagination therefore repeats and skips rows between pages, which is why this
// is a cursor and not a page number.
//
// `kind` is in the key because the tiebreaker `_id` comes from different collections --
// an ObjectId from `reviews` and one from `usermovies` are only globally ordered by their
// embedded timestamp, and two events sharing a timestamp need a deterministic order.
//
// Encoded rather than exposed: the wire form is base64url so a client cannot hand-build a
// cursor with a date field of the wrong type, and so the shape can change without anyone
// depending on it.

import { ObjectId } from "mongodb";

export type CursorKey = {
  date: Date;
  kind: string;
  id: string;
};

export function encodeCursor(key: CursorKey): string {
  return Buffer.from(JSON.stringify([key.date.toISOString(), key.kind, key.id]), "utf8").toString(
    "base64url"
  );
}

// Returns null for anything unreadable rather than throwing: a cursor arriving from a URL
// is untrusted input, and a malformed one should mean "start from the top", not a 500.
export function decodeCursor(raw: string | null | undefined): CursorKey | null {
  if (!raw) return null;

  try {
    const [date, kind, id] = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (typeof date !== "string" || typeof kind !== "string" || typeof id !== "string") return null;

    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return null;

    return { date: parsed, kind, id };
  } catch {
    return null;
  }
}

// Each $unionWith branch applies this to its OWN sort key, so the branch can use its index
// instead of scanning to the merge. `dateField` differs per collection; `branchKind` is that
// branch's discriminator, which the global sort places BETWEEN the date and the _id.
//
// That middle term is what makes this correct. Comparing only (date, _id) against a
// (date, kind, _id) order mixes two orderings: a branch would re-serve rows the union had
// already placed before the cursor, and drop rows it should keep. Measured as 3 duplicates
// across a 25-page walk before the kind term was added.
//
// A branch holds exactly one kind, so the three cases collapse to:
//   branch sorts before the cursor -> those rows were already served, so only older dates
//   branch is the cursor's kind     -> older dates, or the same date with a lower _id
//   branch sorts after the cursor  -> same-date rows are still ahead of us, keep them
// Getting the outer two backwards re-serves everything a same-date sibling branch already
// returned; measured as 3-4 duplicates per 25-page walk.
export function cursorMatch(
  cursor: CursorKey | null,
  dateField: string,
  branchKind: string
): Record<string, unknown> {
  if (!cursor) return {};

  const older = { [dateField]: { $lt: cursor.date } };
  const sameDate = { [dateField]: cursor.date };

  if (branchKind < cursor.kind) {
    return older;
  }
  if (branchKind > cursor.kind) {
    return { $or: [older, sameDate] };
  }

  return { $or: [older, { ...sameDate, _id: { $lt: new ObjectId(cursor.id) } }] };
}

// Sorting the union: `kind` before `_id` so the order matches the cursor's key exactly.
export const FEED_SORT = { date: -1, kind: 1, sortId: -1 } as const;

// `pageSize + 1` per branch, to learn whether more exists without a second count query.
export const FEED_PAGE_SIZE = 15;
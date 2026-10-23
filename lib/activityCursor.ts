import { ObjectId } from "mongodb";

export type CursorKey = {
  date: Date;
  kind: "review" | "list" | "watch";
  id: string;
};

export function encodeCursor(key: CursorKey): string {
  return Buffer.from(JSON.stringify([key.date.toISOString(), key.kind, key.id]), "utf8").toString(
    "base64url"
  );
}

export function decodeCursor(raw: string | null | undefined): CursorKey | null {
  if (!raw) return null;

  try {
    const [date, kind, id] = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (
      typeof date !== "string" ||
      (kind !== "review" && kind !== "list" && kind !== "watch") ||
      typeof id !== "string" ||
      !/^[\da-f]{24}$/i.test(id)
    ) return null;

    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return null;

    return { date: parsed, kind, id };
  } catch {
    return null;
  }
}

export function cursorMatch(
  cursor: CursorKey | null,
  dateField: string,
  branchKind: CursorKey["kind"]
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

export const FEED_SORT = { date: -1, kind: 1, sortId: -1 } as const;
export const FEED_PAGE_SIZE = 15;

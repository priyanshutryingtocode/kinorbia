
export type FeedKind = "review" | "list" | "watch";

export type SerializedFeedRow = {
  kind: FeedKind;
  id: string;
  date: string;
  data: Record<string, unknown>;
};
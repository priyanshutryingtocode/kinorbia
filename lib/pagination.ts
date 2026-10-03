// Clamping a requested page number into the range that actually exists.
//
// This lived in `lib/profileData.ts` and was inlined a second time in
// `components/PeopleFollowPage.tsx`. The arithmetic is the part that can
// silently disagree between two paginators, so it exists once here.
//
// The fetch strategy deliberately stays with each caller: `profileData` runs
// its count and page query in parallel (one round trip in the common case,
// re-fetching only when the clamp moved the page), while `PeopleFollowPage`
// needs the count first to decide whether to query at all. Neither dominates,
// so the shared part is the clamp and nothing else.
export function pageBounds(total: number, requestedPage: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    page: Math.min(Math.max(1, requestedPage), totalPages),
    totalPages,
  };
}

type SortSpec = Record<string, 1 | -1>;

type PageableQuery<TRaw> = {
  sort(sort: SortSpec): PageableQuery<TRaw>;
  select(fields: string): PageableQuery<TRaw>;
  skip(skip: number): PageableQuery<TRaw>;
  limit(limit: number): PageableQuery<TRaw>;
  lean(): Promise<TRaw[]>;
};

type PageableModel<TRaw> = {
  countDocuments(filter: Record<string, unknown>): Promise<number>;
  find(filter: Record<string, unknown>): PageableQuery<TRaw>;
};

// Shared count + windowed fetch. When the requested page is past the end, the
// clamped page is re-fetched instead of returning an empty result set.
//
// This lived in `lib/profileData.ts`, which meant the three public index pages
// could not paginate without importing a module that also reaches for the User
// model, the insight aggregation and the serializers -- all of which they would
// then pull in just to borrow eight lines. The types describe only the four
// query methods actually called, so any Mongoose model satisfies them and the
// dependency stays structural rather than nominal.
export async function paginate<TRaw>(
  model: PageableModel<TRaw>,
  filter: Record<string, unknown>,
  sort: SortSpec,
  requestedPage: number,
  pageSize: number,
  // Optional so a caller that renders a summary card can leave the unbounded
  // likedBy/savedBy arrays behind instead of shipping them with every row.
  projection?: string
): Promise<{ rows: TRaw[]; page: number; totalPages: number; total: number }> {
  const fetchPage = (page: number) => {
    const query = model.find(filter);
    return (projection ? query.select(projection) : query)
      .sort(sort)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean();
  };

  const [total, initialRows] = await Promise.all([
    model.countDocuments(filter),
    fetchPage(Math.max(1, requestedPage)),
  ]);

  const bounds = pageBounds(total, requestedPage, pageSize);
  const rows = bounds.page === requestedPage ? initialRows : await fetchPage(bounds.page);

  return { rows, total, ...bounds };
}

// Page sizes for the public index pages. The profile tabs keep their own, in
// `lib/profileData.ts`, because they were sized against a different layout.
//
// Every one of these sits above the row count the page used to hard-cap at, so
// turning the cap into a pager is what makes the remaining rows reachable
// rather than merely possible.
export const INDEX_PAGE_SIZES = {
  reviews: 12,
  lists: 12,
  activity: 15,
} as const;

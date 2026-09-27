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

// Builds a paginated URL for a list surface. Five copies of this existed, one per page,
  // and they had drifted -- the activity feed kept `feed=following` across pages, and only
  // some omitted `page=1`.
  //
  // Omitting `page=1` is not cosmetic: it keeps every list's first page on its canonical
  // URL so a crawl does not see the same content at `/lists` and `/lists?page=1`.
  //
  // `base` may be empty, yielding a bare `?query` for the tab-style search links.
export function buildPageHref(
  base: string,
  extra: Record<string, string | undefined> = {},
  page = 1
): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(extra)) {
    if (value) {
      params.set(key, value);
    }
  }

  // Page 1 stays on the bare path.
  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();
  return query ? `${base}?${query}` : base;
}
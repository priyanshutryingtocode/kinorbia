
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

  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();
  return query ? `${base}?${query}` : base;
}
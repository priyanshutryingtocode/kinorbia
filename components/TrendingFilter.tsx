import LinkTabs from "@/components/LinkTabs";

// Media type and time window for the trending page.
//
// Both are plain links, not client state. That keeps every combination addressable
// (/, /?type=tv, /?window=day, /?type=tv&window=day), so a specific view can be shared,
// bookmarked and prefetched -- and so switching a filter does not need to survive a reload.
//
// Each control preserves the other axis. Setting "Shows" while "Today" is active has to land
// on /?type=tv&window=day, not silently reset the window to the default.
//
// Trending deliberately has no genre filter: TMDB's trending endpoint takes no genre
// parameter, so a genre view here would mean intersecting two unrelated fetches and would no
// longer be TMDB's ranking.

const MEDIA_TABS = [
  { key: "movie", label: "Movies" },
  { key: "tv", label: "Shows" },
] as const;

const WINDOW_TABS = [
  { key: "day", label: "Today" },
  { key: "week", label: "This week" },
] as const;

export type TrendingFilters = {
  mediaType: "movie" | "tv";
  window: "day" | "week";
};

function href(filters: TrendingFilters, overrides: Partial<TrendingFilters>) {
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();
  // Defaults are omitted so the four states have canonical URLs: "/" and "/?type=tv" rather
  // than a second spelling of the same view.
  if (next.mediaType !== "movie") params.set("type", next.mediaType);
  if (next.window !== "week") params.set("window", next.window);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

export default function TrendingFilter({ filters }: { filters: TrendingFilters }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <LinkTabs
        ariaLabel="Trending media type"
        activeItem={filters.mediaType}
        items={MEDIA_TABS.map((tab) => ({
          key: tab.key,
          label: tab.label,
          href: href(filters, { mediaType: tab.key }),
        }))}
      />

      <LinkTabs
        ariaLabel="Trending time window"
        activeItem={filters.window}
        items={WINDOW_TABS.map((tab) => ({
          key: tab.key,
          label: tab.label,
          href: href(filters, { window: tab.key }),
        }))}
      />
    </div>
  );
}

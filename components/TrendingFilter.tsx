import LinkTabs from "@/components/LinkTabs";

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

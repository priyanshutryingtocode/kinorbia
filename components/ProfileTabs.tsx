import Link from "next/link";

const PROFILE_TABS = [
  { key: "overview", label: "Overview" },
  { key: "insights", label: "Insights" },
  { key: "favorites", label: "Favorites" },
  { key: "watchlist", label: "Watchlist" },
  { key: "reviews", label: "Reviews" },
  { key: "lists", label: "Lists" },
  { key: "journal", label: "Journal" },
] as const;

export type ProfileTab = (typeof PROFILE_TABS)[number]["key"];

function tabHref(tab: ProfileTab, year?: number) {
  if (tab === "overview") {
    return "/profile";
  }

  const params = new URLSearchParams({ tab });
  if (tab === "insights" && year) {
    params.set("year", String(year));
  }
  return `/profile?${params.toString()}`;
}

export default function ProfileTabs({
  current,
  year,
}: {
  current: ProfileTab;
  year?: number;
}) {
  return (
    <nav aria-label="Profile sections" className="overflow-x-auto">
      <div className="flex flex-wrap items-stretch border-b border-white/10 sm:flex-nowrap sm:min-w-max">
        {PROFILE_TABS.map((tab) => {
          const active = tab.key === current;
          return (
            <Link
              key={tab.key}
              href={tabHref(tab.key, year)}
              aria-current={active ? "page" : undefined}
              className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-xs font-semibold tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-red-400/80 sm:px-4 sm:text-sm ${
                active
                  ? "border-red-500 text-red-100"
                  : "border-transparent text-neutral-400 hover:border-white/20 hover:text-neutral-200"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

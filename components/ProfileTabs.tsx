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
    <>
      <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-widest text-neutral-600 sm:hidden">
        Swipe to explore sections
      </p>
      <nav
      aria-label="Profile sections"
      className="hide-scrollbar -mx-1 overflow-x-auto px-1 pb-1"
    >
      <div className="flex min-w-max items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] p-1.5">
        {PROFILE_TABS.map((tab) => {
          const active = tab.key === current;
          return (
            <Link
              key={tab.key}
              href={tabHref(tab.key, year)}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={`kin-focus rounded-full px-4 py-2 text-sm font-semibold transition ${
                active
                  ? "bg-red-500/15 text-red-100 ring-1 ring-red-500/25"
                  : "text-neutral-400 hover:bg-white/7 hover:text-white"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
      </nav>
    </>
  );
}

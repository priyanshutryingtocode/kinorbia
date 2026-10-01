import LinkTabs from "@/components/LinkTabs";

export const PROFILE_TABS = [
  { key: "overview", label: "Overview" },
  { key: "insights", label: "Insights" },
  { key: "favorites", label: "Favorites" },
  { key: "watchlist", label: "Watchlist" },
  { key: "reviews", label: "Reviews" },
  { key: "lists", label: "Lists" },
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

// A thin wrapper over LinkTabs, the way FeedTabs already is. This used to be a
// third hand-rolled copy of the tab bar, and it had drifted: it coloured the
// active tab `text-red-100` where LinkTabs uses `text-content`, and it hand-rolled
// a `focus-visible:ring-1 ring-inset` indicator instead of the `kin-focus`
// token, so the profile tabs had a visibly different focus ring from every
// other tab bar in the app.
export default function ProfileTabs({
  current,
  year,
}: {
  current: ProfileTab;
  year?: number;
}) {
  return (
    <LinkTabs
      ariaLabel="Profile sections"
      activeItem={current}
      wrap
      items={PROFILE_TABS.map((tab) => ({
        key: tab.key,
        label: tab.label,
        href: tabHref(tab.key, year),
      }))}
    />
  );
}
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
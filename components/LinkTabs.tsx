import type { ReactNode } from "react";
import Link from "next/link";

type LinkTabItem = {
  label: ReactNode;
  href: string;
  key?: string;
};

type LinkTabsProps = {
  items: readonly LinkTabItem[];
  activeItem: string;
  ariaLabel: string;
  className?: string;
  // Let the tabs wrap onto a second row instead of scrolling. The profile's six
  // tabs do not fit a 320px screen, so they have to wrap; the activity feed's
  // two and the search page's do not and stay on one scrollable row.
  wrap?: boolean;
};

export default function LinkTabs({
  items,
  activeItem,
  ariaLabel,
  className = "",
  wrap = false,
}: LinkTabsProps) {
  return (
    <nav
      aria-label={ariaLabel}
      className={`hide-scrollbar max-w-full overflow-x-auto ${className}`}
    >
      <div
        className={
          wrap
            ? "flex flex-wrap items-stretch border-b border-rule sm:min-w-max sm:flex-nowrap"
            : "flex w-max min-w-full items-stretch border-b border-rule"
        }
      >
        {items.map((item) => {
          const key = item.key ?? item.href;
          const active = activeItem === key;

          return (
            <Link
              key={key}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`kin-focus -mb-px whitespace-nowrap border-b-2 px-3 py-2 text-xs font-semibold tracking-wide transition-colors sm:px-4 sm:text-sm ${
                active
                  ? "border-accent text-content"
                  : "border-transparent text-content-muted hover:border-rule-strong hover:text-content"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

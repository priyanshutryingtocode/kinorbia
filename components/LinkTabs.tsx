import type { ReactNode } from "react";
import Link from "next/link";

export type LinkTabItem = {
  label: ReactNode;
  href: string;
  key?: string;
};

export type LinkTabsProps = {
  items: readonly LinkTabItem[];
  activeItem: string;
  ariaLabel: string;
  className?: string;
};

export default function LinkTabs({ items, activeItem, ariaLabel, className = "" }: LinkTabsProps) {
  return (
    <nav
      aria-label={ariaLabel}
      className={`hide-scrollbar max-w-full overflow-x-auto ${className}`}
    >
      <div className="flex w-max min-w-full items-stretch border-b border-rule">
        {items.map((item) => {
          const key = item.key ?? item.href;
          const active =
            activeItem === key ||
            activeItem === item.href ||
            (typeof item.label === "string" && activeItem === item.label);

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

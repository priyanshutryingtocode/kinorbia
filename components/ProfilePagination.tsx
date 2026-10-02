import Link from "next/link";
import PagerEdge from "@/components/PagerEdge";
import { PAGER_EDGE_CLASS, PAGER_EDGE_DISABLED_CLASS } from "@/lib/uiClasses";

type ProfilePaginationProps = {
  tab: string;
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
};

// Numbered pages plus a "Showing X-Y of Z" range, where PeopleList offers only
// previous/next and a "Page X of Y" count. Those are different affordances, so
// they are deliberately not one component even though they share PagerEdge --
// and this used to colour the current page `text-red-100`, the drift the tab
// bars had. That is now `text-accent-text` like everything else; the note stayed
// because the two pagers are still deliberately separate.
//
// `tab` is always one of the four paginated tabs. The "overview" and "insights"
// branches this used to have were unreachable, because those tabs render no
// pager: the profile page handles them with earlier `if` branches. The `year`
// parameter went with them, and no call site passed it anyway.
function profileHref(tab: string, page: number) {
  const params = new URLSearchParams({ tab });
  if (page > 1) {
    params.set("page", String(page));
  }
  return `/profile?${params.toString()}`;
}

function visiblePages(page: number, totalPages: number) {
  const count = Math.min(5, totalPages);
  const start = Math.min(Math.max(1, page - 2), Math.max(1, totalPages - count + 1));
  return Array.from({ length: count }, (_, index) => start + index);
}

export default function ProfilePagination({
  tab,
  page,
  totalPages,
  total,
  pageSize,
}: ProfilePaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const pages = visiblePages(page, totalPages);
  const previousClass = PAGER_EDGE_CLASS;
  const previousDisabledClass = PAGER_EDGE_DISABLED_CLASS;
  const pageClass =
    "kin-focus inline-flex h-9 min-w-9 items-center justify-center border-b px-1 text-sm transition-colors";

  return (
    <nav
      aria-label={`${tab} pagination`}
      className="mt-8 flex flex-col gap-3 border-t border-rule pt-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-center text-xs tracking-wide text-content-subtle sm:text-left" aria-live="polite">
        Showing {first}–{last} of {total}
      </p>
      <div className="flex items-center justify-center gap-0.5 sm:gap-1" role="group" aria-label="Pagination pages">
        <PagerEdge
          direction="previous"
          href={page > 1 ? profileHref(tab, page - 1) : undefined}
          className={previousClass}
          disabledClassName={previousDisabledClass}
        />
        {pages.map((pageNumber) => {
          const active = pageNumber === page;
          return (
            <Link
              key={pageNumber}
              href={profileHref(tab, pageNumber)}
              aria-label={`Page ${pageNumber}`}
              aria-current={active ? "page" : undefined}
              className={`${pageClass} ${
                active
                  ? "border-accent/80 font-semibold text-accent-text"
                  : "border-transparent font-normal text-content-subtle hover:border-rule-strong hover:text-content"
              }`}
            >
              {pageNumber}
            </Link>
          );
        })}
        <PagerEdge
          direction="next"
          href={page < totalPages ? profileHref(tab, page + 1) : undefined}
          className={previousClass}
          disabledClassName={previousDisabledClass}
        />
      </div>
    </nav>
  );
}

import Link from "next/link";
import PagerEdge from "@/components/PagerEdge";
import { PAGER_EDGE_CLASS, PAGER_EDGE_DISABLED_CLASS } from "@/lib/uiClasses";

type NumberedPaginationProps = {
  label: string;
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  buildHref: (page: number) => string;
};

export default function NumberedPagination({
  label,
  page,
  totalPages,
  total,
  pageSize,
  buildHref,
}: NumberedPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const pages = visiblePages(page, totalPages);
  const pageClass =
    "kin-focus inline-flex h-9 min-w-9 items-center justify-center border-b px-1 text-sm transition-colors";

  return (
    <nav
      aria-label={`${label} pagination`}
      className="mt-8 flex flex-col gap-3 border-t border-rule pt-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-center text-xs tracking-wide text-content-subtle sm:text-left" aria-live="polite">
        Showing {first}–{last} of {total}
      </p>
      <div
        className="flex items-center justify-center gap-0.5 sm:gap-1"
        role="group"
        aria-label="Pagination pages"
      >
        <PagerEdge
          direction="previous"
          href={page > 1 ? buildHref(page - 1) : undefined}
          className={PAGER_EDGE_CLASS}
          disabledClassName={PAGER_EDGE_DISABLED_CLASS}
        />
        {pages.map((pageNumber) => {
          const active = pageNumber === page;
          return (
            <Link
              key={pageNumber}
              href={buildHref(pageNumber)}
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
          href={page < totalPages ? buildHref(page + 1) : undefined}
          className={PAGER_EDGE_CLASS}
          disabledClassName={PAGER_EDGE_DISABLED_CLASS}
        />
      </div>
    </nav>
  );
}

function visiblePages(page: number, totalPages: number) {
  const count = Math.min(5, totalPages);
  const start = Math.min(Math.max(1, page - 2), Math.max(1, totalPages - count + 1));
  return Array.from({ length: count }, (_, index) => start + index);
}
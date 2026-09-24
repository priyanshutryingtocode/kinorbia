import Link from "next/link";

type ProfilePaginationProps = {
  tab: string;
  page: number;
  totalPages: number;
  year?: number;
  total: number;
  pageSize: number;
};

function profileHref(tab: string, page: number, year?: number) {
  if (tab === "overview") {
    return "/profile";
  }

  const params = new URLSearchParams({ tab });
  if (page > 1) {
    params.set("page", String(page));
  }
  if (tab === "insights" && year) {
    params.set("year", String(year));
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
  year,
  total,
  pageSize,
}: ProfilePaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const pages = visiblePages(page, totalPages);
  const previousClass =
    "kin-focus inline-flex min-h-9 items-center gap-1.5 px-1.5 text-xs font-medium text-neutral-400 transition hover:text-white";
  const previousDisabledClass =
    "inline-flex min-h-9 items-center gap-1.5 px-1.5 text-xs font-medium text-neutral-700";
  const pageClass =
    "kin-focus inline-flex h-9 min-w-9 items-center justify-center border-b px-1 text-sm transition-colors";

  return (
    <nav
      aria-label={`${tab} pagination`}
      className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-center text-xs tracking-wide text-neutral-500 sm:text-left" aria-live="polite">
        Showing {first}–{last} of {total}
      </p>
      <div className="flex items-center justify-center gap-0.5 sm:gap-1" role="group" aria-label="Pagination pages">
        {page > 1 ? (
          <Link
            href={profileHref(tab, page - 1, year)}
            className={previousClass}
            aria-label="Previous page"
          >
            <span aria-hidden="true">←</span>
            <span className="hidden sm:inline">Previous</span>
          </Link>
        ) : (
          <span className={previousDisabledClass} aria-disabled="true">
            <span aria-hidden="true">←</span>
            <span className="sr-only sm:not-sr-only">Previous</span>
          </span>
        )}
        {pages.map((pageNumber) => {
          const active = pageNumber === page;
          return (
            <Link
              key={pageNumber}
              href={profileHref(tab, pageNumber, year)}
              aria-label={`Page ${pageNumber}`}
              aria-current={active ? "page" : undefined}
              className={`${pageClass} ${
                active
                  ? "border-red-500/80 font-semibold text-red-100"
                  : "border-transparent font-normal text-neutral-500 hover:border-white/20 hover:text-neutral-200"
              }`}
            >
              {pageNumber}
            </Link>
          );
        })}
        {page < totalPages ? (
          <Link
            href={profileHref(tab, page + 1, year)}
            className={previousClass}
            aria-label="Next page"
          >
            <span className="hidden sm:inline">Next</span>
            <span aria-hidden="true">→</span>
          </Link>
        ) : (
          <span className={previousDisabledClass} aria-disabled="true">
            <span className="sr-only sm:not-sr-only">Next</span>
            <span aria-hidden="true">→</span>
          </span>
        )}
      </div>
    </nav>
  );
}

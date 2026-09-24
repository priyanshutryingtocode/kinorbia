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
  const baseClass = "kin-focus inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-semibold text-neutral-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white";
  const disabledClass = "inline-flex min-h-11 items-center justify-center rounded-full border border-white/5 bg-white/[0.02] px-5 py-2 text-sm font-semibold text-neutral-700";

  return (
    <nav aria-label={`${tab} pagination`} className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
      <p className="text-sm text-neutral-500" aria-live="polite">Showing {first}–{last} of {total}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {page > 1 ? (
          <Link href={profileHref(tab, page - 1, year)} className={baseClass} aria-label="Previous page">Previous</Link>
        ) : (
          <span className={disabledClass} aria-disabled="true">Previous</span>
        )}
        <span className="min-w-20 text-center text-sm text-neutral-500">Page {page} of {totalPages}</span>
        {page < totalPages ? (
          <Link href={profileHref(tab, page + 1, year)} className={baseClass} aria-label="Next page">Next</Link>
        ) : (
          <span className={disabledClass} aria-disabled="true">Next</span>
        )}
      </div>
    </nav>
  );
}

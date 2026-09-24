import Link from "next/link";
import { Search } from "lucide-react";
import EmptyState from "./EmptyState";
import PersonCard, { type Person } from "./PersonCard";

const PEOPLE_PER_PAGE = 24;

type PeopleListProps = {
  people: Person[];
  isAuthenticated: boolean;
  path: string;
  query: string;
  page: number;
  totalCount: number;
  totalPages: number;
  emptyTitle: string;
  emptyDescription: string;
};

function pageHref(path: string, query: string, page: number) {
  const params = new URLSearchParams();
  if (query) {
    params.set("q", query);
  }
  if (page > 1) {
    params.set("page", String(page));
  }
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

export default function PeopleList({
  people,
  isAuthenticated,
  path,
  query,
  page,
  totalCount,
  totalPages,
  emptyTitle,
  emptyDescription,
}: PeopleListProps) {
  const firstResult = totalCount ? (page - 1) * PEOPLE_PER_PAGE + 1 : 0;
  const lastResult = Math.min(page * PEOPLE_PER_PAGE, totalCount);
  const hasPrevious = page > 1;
  const hasNext = page < totalPages;
  const paginationClasses =
    "kin-focus inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-medium text-neutral-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white";
  const disabledPaginationClasses =
    "inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-full border border-white/5 bg-white/[0.02] px-5 py-2 text-sm font-medium text-neutral-700";

  return (
    <div>
      <form
        action={path}
        method="get"
        role="search"
        aria-label="Search followers or following"
        className="premium-card rounded-card p-4"
      >
        <input type="hidden" name="page" value="1" />
        <label htmlFor="people-search" className="sr-only">
          Search people by name or username
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-500"
            aria-hidden="true"
          />
          <input
            id="people-search"
            name="q"
            type="search"
            defaultValue={query}
            maxLength={100}
            placeholder="Search by name or username"
            className="kin-focus w-full rounded-lg border border-white/10 bg-neutral-950 py-3 pl-12 pr-28 text-white placeholder:text-neutral-600 focus:border-red-500/50"
          />
          <button
            type="submit"
            className="kin-focus absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-red-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-red-500"
          >
            Search
          </button>
        </div>
        <div className="mt-3 flex min-h-6 flex-wrap items-center justify-between gap-2 text-xs text-neutral-500">
          <p>Matches both names and usernames.</p>
          {query && (
            <Link
              href={path}
              className="kin-focus rounded-sm font-medium text-neutral-300 transition hover:text-white"
            >
              Clear search
            </Link>
          )}
        </div>
      </form>

      {people.length ? (
        <>
          <p
            className="mt-6 text-sm text-neutral-500"
            aria-live="polite"
            aria-atomic="true"
          >
            Showing {firstResult}–{lastResult} of {totalCount}
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {people.map((person) => (
              <PersonCard
                key={person.id}
                person={person}
                isAuthenticated={isAuthenticated}
                path={path}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="mt-6">
          <EmptyState
            title={query ? `No people found for “${query}”` : emptyTitle}
            description={query ? "Try a different name or username." : emptyDescription}
          />
        </div>
      )}

      {totalPages > 1 && (
        <nav
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
          aria-label="People pagination"
        >
          {hasPrevious ? (
            <Link
              href={pageHref(path, query, page - 1)}
              className={paginationClasses}
              aria-label="Previous page"
            >
              Previous
            </Link>
          ) : (
            <span className={disabledPaginationClasses} aria-disabled="true">
              Previous
            </span>
          )}
          <span className="min-w-24 text-center text-sm text-neutral-500" aria-live="polite">
            Page {page} of {totalPages}
          </span>
          {hasNext ? (
            <Link
              href={pageHref(path, query, page + 1)}
              className={paginationClasses}
              aria-label="Next page"
            >
              Next
            </Link>
          ) : (
            <span className={disabledPaginationClasses} aria-disabled="true">
              Next
            </span>
          )}
        </nav>
      )}
    </div>
  );
}

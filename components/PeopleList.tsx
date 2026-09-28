import Link from "next/link";
import { Search } from "lucide-react";
import EmptyState from "./EmptyState";
import PagerEdge from "./PagerEdge";
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
    "kin-focus inline-flex min-h-9 items-center gap-1.5 px-1.5 text-xs font-medium text-content-muted transition-colors hover:text-content";
  const disabledPaginationClasses =
    "inline-flex min-h-9 items-center gap-1.5 px-1.5 text-xs font-medium text-neutral-700";

  return (
    <div>
      <form
        action={path}
        method="get"
        role="search"
        aria-label="Search followers or following"
        className="border-y border-rule py-3"
      >
        <input type="hidden" name="page" value="1" />
        <label htmlFor="people-search" className="sr-only">
          Search people by name or username
        </label>
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted"
              aria-hidden="true"
            />
            <input
              id="people-search"
              name="q"
              type="search"
              defaultValue={query}
              maxLength={100}
              placeholder="Search by name or username"
              className="kin-focus h-10 w-full rounded-sm border border-rule bg-canvas pl-10 pr-3 text-sm text-content transition-colors placeholder:text-content-muted focus:border-accent/50"
            />
          </div>
          <button
            type="submit"
            className="kin-focus h-10 shrink-0 rounded-sm bg-accent px-4 text-xs font-semibold text-content transition-colors hover:bg-accent-hover"
          >
            Search
          </button>
        </div>
        <div className="mt-2 flex min-h-5 flex-wrap items-center justify-between gap-2 text-[11px] text-content-muted">
          <p>Search names and usernames.</p>
          {query && (
            <Link
              href={path}
              className="kin-focus rounded-sm font-medium text-content transition-colors hover:text-content"
            >
              Clear search
            </Link>
          )}
        </div>
      </form>

      {people.length ? (
        <>
          <p
            className="mt-5 text-xs tracking-wide text-content-muted"
            aria-live="polite"
            aria-atomic="true"
          >
            Showing {firstResult}–{lastResult} of {totalCount}
          </p>
          <ul className="mt-2 border-y border-rule">
            {people.map((person) => (
              <li
                key={person.id}
                className="border-b border-rule last:border-b-0"
              >
                <PersonCard
                  person={person}
                  isAuthenticated={isAuthenticated}
                  path={path}
                />
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="mt-6">
          <EmptyState
            compact
            title={query ? `No people found for “${query}”` : emptyTitle}
            description={query ? "Try a different name or username." : emptyDescription}
          />
        </div>
      )}

      {totalPages > 1 && (
        <nav
          className="mt-6 flex items-center justify-between border-t border-rule pt-3"
          aria-label="People pagination"
        >
          <PagerEdge
            direction="previous"
            href={hasPrevious ? pageHref(path, query, page - 1) : undefined}
            className={paginationClasses}
            disabledClassName={disabledPaginationClasses}
          />
          <span
            className="text-xs text-content-muted"
            aria-live="polite"
            aria-atomic="true"
          >
            Page {page} of {totalPages}
          </span>
          <PagerEdge
            direction="next"
            href={hasNext ? pageHref(path, query, page + 1) : undefined}
            className={paginationClasses}
            disabledClassName={disabledPaginationClasses}
          />
        </nav>
      )}
    </div>
  );
}

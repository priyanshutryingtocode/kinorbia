import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { CURATED_GENRES, genreName } from "@/lib/genres";
import { starsLabel } from "@/lib/media";
import { LIBRARY_SORTS, libraryFacetQuery, type LibraryFacetParams } from "@/lib/searchParams";

const SORT_LABELS: Record<(typeof LIBRARY_SORTS)[number], string> = {
  recent: "Recently added",
  rating: "My rating",
  title: "Title A-Z",
  year: "Release year",
};

const RATING_STEPS = [4, 5, 6, 7, 8, 9, 10];
const starLabel = (stored: number) => starsLabel(stored).replace(/\.0$/, "");
const SELECT_CLASS = "kin-input kin-filter-control appearance-none pr-9";

function Chevron() {
  return (
    <ChevronDown
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-subtle"
      aria-hidden="true"
    />
  );
}

function Cell({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 bg-canvas p-4 sm:p-5">
      <div className="kin-field">
        <label htmlFor={id} className="kin-overline text-content-muted">
          {label}
        </label>
        {children}
      </div>
    </div>
  );
}

type LibraryFiltersProps = {
  tab: string;
  facets: LibraryFacetParams;
  showRating?: boolean;
};

export default function LibraryFilters({ tab, facets, showRating = true }: LibraryFiltersProps) {
  const active = libraryFacetQuery(facets);
  const hasFilters = Array.from(active.keys()).length > 0;
  const pills: string[] = [];
  if (facets.genre !== undefined) pills.push(genreName(facets.genre, "movie"));
  if (showRating && facets.minRating !== undefined) pills.push(`${starLabel(facets.minRating)}+ stars`);
  if (facets.year !== undefined) pills.push(String(facets.year));
  if (facets.sort !== undefined && facets.sort !== "recent") pills.push(SORT_LABELS[facets.sort]);

  return (
    <form
      method="get"
      action="/profile"
      className="mb-6 overflow-hidden rounded-sm border border-rule bg-surface-raised"
    >
      <input type="hidden" name="tab" value={tab} />

        <div
          className={`grid gap-px ${
            showRating ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-1 sm:grid-cols-3"
          }`}
        >
        <Cell id="library-genre" label="Genre">
          <div className="relative">
            <select id="library-genre" name="genre" defaultValue={facets.genre ?? ""} className={SELECT_CLASS}>
              <option value="">All genres</option>
              {CURATED_GENRES.movie.map((id) => (
                <option key={id} value={id}>
                  {genreName(id, "movie")}
                </option>
              ))}
            </select>
            <Chevron />
          </div>
        </Cell>

        {showRating && (
          <Cell id="library-rating" label="My rating">
            <div className="relative">
              <select id="library-rating" name="minRating" defaultValue={facets.minRating ?? ""} className={SELECT_CLASS}>
                <option value="">Any rating</option>
                {RATING_STEPS.map((step) => (
                  <option key={step} value={step}>
                    {starLabel(step)}+ stars
                  </option>
                ))}
              </select>
              <Chevron />
            </div>
          </Cell>
        )}

        <Cell id="library-year" label="Year">
          <input
            id="library-year"
            type="number"
            name="year"
            inputMode="numeric"
            placeholder="Any"
            min={1870}
            max={2100}
            defaultValue={facets.year ?? ""}
            className="kin-input kin-filter-control"
          />
        </Cell>

        <Cell id="library-sort" label="Sort">
          <div className="relative">
            <select id="library-sort" name="sort" defaultValue={facets.sort ?? "recent"} className={SELECT_CLASS}>
              {LIBRARY_SORTS.map((sort) => (
                <option key={sort} value={sort}>
                  {SORT_LABELS[sort]}
                </option>
              ))}
            </select>
            <Chevron />
          </div>
        </Cell>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-rule bg-canvas px-4 py-3 sm:px-5">
        <button
          type="submit"
          className="kin-focus rounded-control border border-transparent bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
        >
          Apply
        </button>

        {hasFilters && (
          <a
            href={`/profile?tab=${tab}`}
            className="kin-focus text-sm text-content-subtle underline underline-offset-4 transition-colors hover:text-content"
          >
            Clear filters
          </a>
        )}

        {pills.map((pill) => (
          <span
            key={pill}
            className="rounded-control border border-accent/35 bg-accent/10 px-2.5 py-1 text-xs text-accent-text"
          >
            {pill}
          </span>
        ))}
      </div>
    </form>
  );
}
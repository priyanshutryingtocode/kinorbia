import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { CURATED_GENRES, genreName } from "@/lib/genres";
import { starsLabel } from "@/lib/media";
import { LIBRARY_SORTS, libraryFacetQuery, type LibraryFacetParams } from "@/lib/searchParams";

// Facet bar for a member's own library, as a plain GET form so it works without JavaScript
// and yields a shareable URL. `page` is deliberately absent: changing a facet returns to page 1.
//
// Styled as the profile metric rail -- one box, cells divided by a 1px gap over the container
// background rather than cell borders. Explicit columns, not the rail's auto-fit: this always
// has four, and auto-fit orphans one between ~408px and ~544px.

const SORT_LABELS: Record<(typeof LIBRARY_SORTS)[number], string> = {
  recent: "Recently added",
  rating: "My rating",
  title: "Title A-Z",
  year: "Release year",
};

// Stored ratings are 1-10; every rating the member SEES is in stars, because starsLabel
// halves it and the rating control's slider runs 0.5-5. So the values below stay as stored
// integers -- the query is unchanged -- and only the labels are converted. They used to read
// "4+" .. "10+", which on a 5-star scale meant "2 stars" .. "5 stars" and read as if the app
// rated things out of 10 when it does not.
//
// The floor stays at 4 (2 stars): below that a rating is not a meaningful filter.
const RATING_STEPS = [4, 5, 6, 7, 8, 9, 10];

// "2.0" reads as noise in a dropdown; "2" is what the slider's 2-star detent shows.
const starLabel = (stored: number) => starsLabel(stored).replace(/\.0$/, "");

// The native dropdown's open panel is drawn by the OS and cannot be styled, so `appearance-none`
// is here to make the CLOSED control match the bar. That removes the system's own affordance,
// which is why the chevron is not optional -- and why it stays pointer-events-none, or it
// would swallow clicks on the control underneath it.
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
        {/* kin-overline, not kin-label: the rail's micro-label is 10px, kin-label is 12px. */}
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
  /**
   * False hides the rating facet and drops minRating from the pills. A watchlist row only
   * carries a rating when the title is also a favorite, so with nothing rated there the
   * filter could only ever return an empty page -- a control that guarantees a blank result.
   */
  showRating?: boolean;
};

export default function LibraryFilters({ tab, facets, showRating = true }: LibraryFiltersProps) {
  const active = libraryFacetQuery(facets);
  const hasFilters = Array.from(active.keys()).length > 0;

  // The applied state, restated in the bar's own visual language. A native select shows its
  // selection in an OS panel that looks nothing like this page, so the *chosen* filters are
  // surfaced as accent pills instead -- otherwise nothing on screen says which filters are in
  // effect once the popup has closed.
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
            // The rating cell is conditional, so a fixed 4-column template left a bare
            // track showing the form background through the 1px gaps. Hiding the cell also
            // drops a column. Mobile goes single, not 2, to avoid a 2+1 orphan row.
            showRating ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-1 sm:grid-cols-3"
          }`}
        >
        <Cell id="library-genre" label="Genre">
          <div className="relative">
            <select id="library-genre" name="genre" defaultValue={facets.genre ?? ""} className={SELECT_CLASS}>
              <option value="">All genres</option>
              {/* Movie genres only. TMDB shares several ids across media types (18 is Drama for
                  both movies and shows), so the popular ones carry over correctly, but a
                  TV-only genre id has no entry here and cannot be picked. Pre-existing, and a
                  separate fix from this bar's rating scale. */}
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
          {/* Not a select, so no chevron and no pr-9 -- that padding would be a stray gap. */}
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
        {/* Primary, because this is the action that applies the bar. It used to be a plain
            bordered box identical to the controls, so it read as a fifth input. */}
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
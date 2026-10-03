import { Search } from "lucide-react";
import type { Metadata } from "next";
import RouteShell from "@/components/RouteShell";
import PageHeader from "@/components/PageHeader";
import SectionHeader from "@/components/SectionHeader";
import LinkTabs from "@/components/LinkTabs";
import SearchHistory from "@/components/SearchHistory";
import SearchTrackerForm from "@/components/SearchTrackerForm";
import EmptyState from "@/components/EmptyState";
import { fetchSearchResults, hasAnyFilter, type SearchFilters } from "@/lib/search";
import { fetchSearchPage } from "../../actions";
import SearchResultCard from "@/components/SearchResultCard";
import SearchLoadMore from "@/components/SearchLoadMore";
import { CURATED_GENRES, curatedGenreName } from "@/lib/genres";
import { normalizeMediaType } from "@/lib/media";

type SearchParams = {
  q?: string;
  year?: string;
  minRating?: string;
  genre?: string;
  runtime?: string;
  language?: string;
  sort?: string;
  type?: string;
};

type SearchPageProps = {
  searchParams: Promise<SearchParams> | SearchParams;
};

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const { q, type } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const mediaType = type === "tv" ? "Shows" : "Movies";

  return {
    title: query ? `Search results for "${query}"` : "Search KinOrbia",
    description: query
      ? `Search results for "${query}" across ${mediaType.toLowerCase()} on KinOrbia.`
      : "Find movies and shows by title, genre, rating, runtime, language, and year.",
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q, year, minRating, genre, runtime, language, sort, type } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const releaseYear = typeof year === "string" ? year.trim() : "";
  const minimumRating = typeof minRating === "string" ? Number(minRating) : 0;
  const selectedGenre = typeof genre === "string" ? genre : "";
  const maxRuntime = typeof runtime === "string" ? runtime : "";
  const selectedLanguage = typeof language === "string" ? language : "";
  const selectedSort = typeof sort === "string" ? sort : "";
  const mediaType = type === "tv" ? "tv" : "movie";
  const isTv = mediaType === "tv";
  // One object, read twice: the server fetch below and the `args` handed to
  // SearchLoadMore. They were two hand-written copies of the same nine keys, so
  // adding a filter meant editing both in this file with nothing to catch a
  // mismatch -- and a mismatch is not cosmetic. Page 1 and page 2+ would query
  // different filters, so "load more" would silently append results from a
  // different search, and useLoadMore's dedupe cannot detect that.
  //
  // `sort` deliberately counts towards hasNoFilters: the page always sends one
  // (defaulting to popularity), so a sort-only visit is a real search. Without it,
  // `?sort=rating.desc` fell through to "Start discovering" and never fetched
  // anything.
  const filters: SearchFilters = {
    query,
    year: releaseYear,
    genre: selectedGenre,
    minRating: minimumRating,
    maxRuntime,
    language: selectedLanguage,
    sort: selectedSort,
    type: mediaType,
  };

  const hasNoFilters = !hasAnyFilter(filters);

  const buildTypeHref = (nextType: "movie" | "tv") => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (releaseYear) params.set("year", releaseYear);
    if (minRating) params.set("minRating", minRating);
    if (selectedGenre) params.set("genre", selectedGenre);
    if (maxRuntime) params.set("runtime", maxRuntime);
    if (selectedLanguage) params.set("language", selectedLanguage);
    if (selectedSort) params.set("sort", selectedSort);
    params.set("type", nextType);
    return `?${params.toString()}`;
  };

  const data = await fetchSearchResults(filters, 1);
  // Already filtered by the action, so each page arrives ready to render. A
  // client-side filter here would hide matches from the appended pages while
  // leaving the "load more" control unable to tell that upstream still has some.
  const movies = data.results;

  return (
    <RouteShell spacing="standard" width="page">
      <PageHeader
        eyebrow="Search"
        title={`Find a ${isTv ? "Show" : "Movie"}`}
        description={
          isTv
            ? "Search by title or use filters to discover TV shows by genre, rating, language, and first air year."
            : "Search by title or use filters to discover movies by genre, rating, runtime, language, and release year."
        }
      />

      <LinkTabs
        ariaLabel="Search media type"
        activeItem={mediaType}
        items={[
          { key: "movie", label: "Movies", href: buildTypeHref("movie") },
          { key: "tv", label: "Shows", href: buildTypeHref("tv") },
        ]}
        className="mb-6 mt-6"
      />

      <SearchHistory mediaType={mediaType} />

      <SearchTrackerForm mediaType={mediaType}>
        <div className="kin-field">
          <label htmlFor="search-query" className="kin-label">
            Title
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-content-subtle" aria-hidden="true" />
            <input
              id="search-query"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Search by title..."
              className="kin-input kin-search-input h-12"
            />
            <button
              type="submit"
              className="kin-focus absolute right-1.5 top-1/2 inline-flex h-12 -translate-y-1/2 items-center justify-center rounded-control bg-accent px-4 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover"
            >
              Search
            </button>
          </div>
        </div>

        <fieldset className="mt-5">
          <legend className="kin-label mb-3">Filters</legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <div className="kin-field">
              <label htmlFor="search-year" className="kin-label">
                {isTv ? "First air year" : "Release year"}
              </label>
              <input
                id="search-year"
                name="year"
                type="number"
                min="1888"
                max="2100"
                defaultValue={releaseYear}
                placeholder="Any year"
                className="kin-input kin-filter-control"
              />
            </div>

            <div className="kin-field">
              <label htmlFor="search-rating" className="kin-label">Minimum rating</label>
              <select
                id="search-rating"
                name="minRating"
                defaultValue={Number.isFinite(minimumRating) && minimumRating > 0 ? minimumRating.toString() : ""}
                className="kin-input kin-filter-control"
              >
                <option value="">Any rating</option>
                <option value="5">5+ TMDB rating</option>
                <option value="6">6+ TMDB rating</option>
                <option value="7">7+ TMDB rating</option>
                <option value="8">8+ TMDB rating</option>
              </select>
            </div>

            <div className="kin-field">
              <label htmlFor="search-genre" className="kin-label">Genre</label>
              <select id="search-genre" name="genre" defaultValue={selectedGenre} className="kin-input kin-filter-control">
                {/* Same curated list as the browse filter, with names resolved
                    from lib/genres so the two cannot disagree. */}
                <option value="">Any genre</option>
                {CURATED_GENRES[isTv ? "tv" : "movie"].map((id) => (
                  <option key={id} value={id}>
                    {curatedGenreName(id, isTv ? "tv" : "movie")}
                  </option>
                ))}
              </select>
            </div>

            {mediaType === "movie" && (
              <div className="kin-field">
                <label htmlFor="search-runtime" className="kin-label">Maximum runtime</label>
                <select id="search-runtime" name="runtime" defaultValue={maxRuntime} className="kin-input kin-filter-control">
                  <option value="">Any runtime</option>
                  <option value="90">Under 90 min</option>
                  <option value="120">Under 2 hours</option>
                  <option value="150">Under 2.5 hours</option>
                </select>
              </div>
            )}

            <div className="kin-field">
              <label htmlFor="search-language" className="kin-label">Language</label>
              <select id="search-language" name="language" defaultValue={selectedLanguage} className="kin-input kin-filter-control">
                <option value="">Any language</option>
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="ja">Japanese</option>
                <option value="ko">Korean</option>
                <option value="fr">French</option>
              </select>
            </div>

            <div className="kin-field">
              <label htmlFor="search-sort" className="kin-label">Sort</label>
              <select id="search-sort" name="sort" defaultValue={selectedSort} className="kin-input kin-filter-control">
                <option value="popularity.desc">Most popular</option>
                <option value="vote_average.desc">Highest rated</option>
                <option value={isTv ? "first_air_date.desc" : "primary_release_date.desc"}>Newest</option>
                {mediaType === "movie" && <option value="revenue.desc">Box office</option>}
              </select>
            </div>
          </div>
        </fieldset>
      </SearchTrackerForm>

      {hasNoFilters ? (
        <EmptyState
          compact
          headingLevel={2}
          className="mt-8"
          title="Start discovering"
          description={`Type a ${isTv ? "show" : "movie"} title or choose filters to begin.`}
        />
      ) : movies.length === 0 ? (
        <EmptyState
          compact
          headingLevel={2}
          className="mt-8"
          title={`No ${isTv ? "shows" : "movies"} found`}
          description={
            query
              ? `We couldn't find any results for "${query}". Try a different title or adjust your filters.`
              : "Try adjusting your filters to find more results."
          }
        />
      ) : (
        <section aria-labelledby="search-results-heading">
          <SectionHeader
            id="search-results"
            eyebrow={query ? "Title search" : "Discovery"}
            title={query ? <>Results for <span className="text-highlight">{query}</span></> : "Discovery results"}
            description={`${movies.length} ${movies.length === 1 ? "result" : "results"}`}
            className="mt-8"
          />
          <ul className="mt-5 poster-grid-dense">
            {movies.map((movie) => (
              <SearchResultCard
                key={`${normalizeMediaType(movie.mediaType)}-${movie.id}`}
                movie={movie}
              />
            ))}
          </ul>

          {/* No `!hasNoFilters` guard needed: this sits inside the arm reached
              only when `hasNoFilters` is already false, so the check was always
              true. */}
          <SearchLoadMore
            key={`${query}|${selectedGenre}|${releaseYear}|${selectedLanguage}|${selectedSort}|${mediaType}`}
            action={fetchSearchPage}
            args={filters}
          />
        </section>
      )}
    </RouteShell>
  );
}

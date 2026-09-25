import Link from "next/link";
import { Film, Search } from "lucide-react";
import type { Metadata } from "next";
import RouteShell from "@/components/RouteShell";
import PageHeader from "@/components/PageHeader";
import SectionHeader from "@/components/SectionHeader";
import LinkTabs from "@/components/LinkTabs";
import TmdbPosterImage from "@/components/TmdbPosterImage";
import SearchHistory from "@/components/SearchHistory";
import SearchTrackerForm from "@/components/SearchTrackerForm";
import EmptyState from "@/components/EmptyState";
import {
  searchMovies as searchTmdbMovies,
  discoverMovies,
  searchTv as searchTmdbTv,
  discoverTv,
} from "@/lib/tmdb";
import type { MovieSummary } from "@/types";
import { mediaHref, normalizeMediaType, tmdbImage } from "@/lib/media";

type SearchResponse = {
  results?: MovieSummary[];
};

async function searchContent({
  query,
  year,
  genre,
  minRating,
  maxRuntime,
  language,
  sort,
  type,
}: {
  query: string;
  year: string;
  genre: string;
  minRating: number;
  maxRuntime: string;
  language: string;
  sort: string;
  type: "movie" | "tv";
}): Promise<SearchResponse> {
  const isTv = type === "tv";
  const yearKey = isTv ? "first_air_date_year" : "primary_release_year";
  const yearParam = year ? `&${yearKey}=${encodeURIComponent(year)}` : "";
  const ratingParam = minRating ? `&vote_average.gte=${encodeURIComponent(minRating)}` : "";
  const genreParam = genre ? `&with_genres=${encodeURIComponent(genre)}` : "";
  const runtimeParam = !isTv && maxRuntime ? `&with_runtime.lte=${encodeURIComponent(maxRuntime)}` : "";
  const languageParam = language ? `&with_original_language=${encodeURIComponent(language)}` : "";
  const sortParam = sort ? `&sort_by=${encodeURIComponent(sort)}` : "&sort_by=popularity.desc";

  if (!query && !year && !genre && !minRating && !maxRuntime && !language) {
    return { results: [] };
  }

  if (query) {
    const data = isTv ? await searchTmdbTv(query, yearParam) : await searchTmdbMovies(query, yearParam);
    return { results: data?.results || [] };
  }

  const data = isTv
    ? await discoverTv(yearParam + ratingParam + genreParam + languageParam + sortParam)
    : await discoverMovies(yearParam + ratingParam + genreParam + runtimeParam + languageParam + sortParam);
  return { results: data?.results || [] };
}

type SearchPageProps = {
  searchParams: Promise<{
    q?: string;
    year?: string;
    minRating?: string;
    genre?: string;
    runtime?: string;
    language?: string;
    sort?: string;
    type?: string;
  }> | {
    q?: string;
    year?: string;
    minRating?: string;
    genre?: string;
    runtime?: string;
    language?: string;
    sort?: string;
    type?: string;
  };
};

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const { q, type } = await Promise.resolve(searchParams);
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
  const { q, year, minRating, genre, runtime, language, sort, type } = await Promise.resolve(searchParams);
  const query = typeof q === "string" ? q.trim() : "";
  const releaseYear = typeof year === "string" ? year.trim() : "";
  const minimumRating = typeof minRating === "string" ? Number(minRating) : 0;
  const selectedGenre = typeof genre === "string" ? genre : "";
  const maxRuntime = typeof runtime === "string" ? runtime : "";
  const selectedLanguage = typeof language === "string" ? language : "";
  const selectedSort = typeof sort === "string" ? sort : "";
  const mediaType = type === "tv" ? "tv" : "movie";

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

  const data = await searchContent({
    query,
    year: releaseYear,
    genre: selectedGenre,
    minRating: minimumRating,
    maxRuntime,
    language: selectedLanguage,
    sort: selectedSort,
    type: mediaType,
  });
  const movies = (data.results || []).filter((movie) => {
    const matchesRating = !minimumRating || movie.vote_average >= minimumRating;
    const matchesGenre = !query || !selectedGenre || movie.genre_ids?.includes(Number(selectedGenre));
    const matchesLanguage = !query || !selectedLanguage || movie.original_language === selectedLanguage;
    return matchesRating && matchesGenre && matchesLanguage;
  });

  return (
    <RouteShell spacing="standard" width="page">
      <PageHeader
        eyebrow="Search"
        title={`Find a ${mediaType === "tv" ? "Show" : "Movie"}`}
        description={
          mediaType === "tv"
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
              className="kin-focus absolute right-1.5 top-1/2 inline-flex h-12 -translate-y-1/2 items-center justify-center rounded-control bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              Search
            </button>
          </div>
        </div>

        <fieldset className="mt-5">
          <legend className="kin-label mb-3">Filters</legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="kin-field">
              <label htmlFor="search-year" className="kin-label">
                {mediaType === "tv" ? "First air year" : "Release year"}
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
                {mediaType === "tv" ? (
                  <>
                    <option value="">Any genre</option>
                    <option value="10759">Action & Adventure</option>
                    <option value="16">Animation</option>
                    <option value="35">Comedy</option>
                    <option value="80">Crime</option>
                    <option value="99">Documentary</option>
                    <option value="18">Drama</option>
                    <option value="10751">Family</option>
                    <option value="9648">Mystery</option>
                    <option value="10765">Sci-Fi & Fantasy</option>
                    <option value="10768">War & Politics</option>
                  </>
                ) : (
                  <>
                    <option value="">Any genre</option>
                    <option value="28">Action</option>
                    <option value="35">Comedy</option>
                    <option value="18">Drama</option>
                    <option value="27">Horror</option>
                    <option value="878">Sci-Fi</option>
                    <option value="53">Thriller</option>
                  </>
                )}
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
                <option value={mediaType === "tv" ? "first_air_date.desc" : "primary_release_date.desc"}>Newest</option>
                {mediaType === "movie" && <option value="revenue.desc">Box office</option>}
              </select>
            </div>
          </div>
        </fieldset>
      </SearchTrackerForm>

      {!query && !releaseYear && !selectedGenre && !minimumRating && !maxRuntime && !selectedLanguage ? (
        <EmptyState
          compact
          headingLevel={2}
          className="mt-8"
          title="Start discovering"
          description={`Type a ${mediaType === "tv" ? "show" : "movie"} title or choose filters to begin.`}
        />
      ) : movies.length === 0 ? (
        <EmptyState
          compact
          headingLevel={2}
          className="mt-8"
          title={`No ${mediaType === "tv" ? "shows" : "movies"} found`}
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
          <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {movies.map((movie) => {
              const poster = tmdbImage(movie.poster_path, "w500");
              const resultMediaType = normalizeMediaType(movie.mediaType);
              const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : "N/A";
              const href = mediaHref(resultMediaType, movie.id);

              return (
                <li key={`${resultMediaType}-${movie.id}`}>
                  <Link
                    href={href}
                    className="kin-focus group block overflow-hidden rounded-control border border-rule bg-surface-raised transition-colors hover:border-highlight/40"
                    aria-label={`${movie.title} (${releaseYear}, ${resultMediaType === "tv" ? "TV show" : "movie"})`}
                  >
                    <div className="relative aspect-2/3 overflow-hidden bg-surface-raised">
                      {poster ? (
                        <TmdbPosterImage
                          src={poster}
                          alt=""
                          fill
                          sizes="(min-width: 1024px) 20vw, (min-width: 768px) 25vw, 50vw"
                          className="object-cover transition-opacity group-hover:opacity-80"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-content-subtle">
                          <Film className="h-8 w-8" aria-hidden="true" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="truncate font-display text-base font-medium text-content transition-colors group-hover:text-highlight">
                        {movie.title}
                      </h3>
                      <p className="mt-1 text-xs text-content-subtle">{releaseYear}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </RouteShell>
  );
}

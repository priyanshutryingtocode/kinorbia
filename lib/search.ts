import {
  discoverMovies,
  discoverTv,
  searchMovies,
  searchTv,
} from "@/lib/tmdb";
import type { MovieSummary } from "@/types";

export type SearchFilters = {
  query: string;
  year: string;
  genre: string;
  minRating: number;
  maxRuntime: string;
  language: string;
  sort: string;
  type: "movie" | "tv";
};

export type SearchPage = { results: MovieSummary[]; hasMore: boolean };

// "Is there enough here to search?" -- one implementation, because the page and
// this function previously each spelled it out and carried a comment asking the
// reader to keep them in sync by hand. `sort` is deliberately included: the page
// always sends one (defaulting to popularity), so a sort-only visit is a real
// search, and excluding it here showed "No results" instead of fetching
// anything. Accepts the whole filter object rather than eight arguments, so a
// filter added later is picked up by both call sites automatically.
export function hasAnyFilter(filters: {
  query?: string;
  year?: string;
  genre?: string;
  minRating?: number;
  maxRuntime?: string;
  language?: string;
  sort?: string;
}): boolean {
  return Boolean(
    filters.query ||
      filters.year ||
      filters.genre ||
      filters.minRating ||
      filters.maxRuntime ||
      filters.language ||
      filters.sort
  );
}

// The rating/genre/language filters TMDB's search endpoint cannot express, so
// they are applied here after the fetch.
//
// The `!query ||` guards are deliberate and load-bearing: during a *title*
// search TMDB ignores genre and language, so those two are filtered by hand,
// but during a *discovery* search they were already sent as query parameters
// and re-filtering would exclude rows whose genre/language metadata the
// normalized result shape does not carry. Removing the guards would silently
// change existing results, so they stay exactly as they were.
function applyClientFilters(
  results: MovieSummary[],
  { query, genre, minRating, language }: Pick<SearchFilters, "query" | "genre" | "minRating" | "language">
) {
  return results.filter((movie) => {
    const matchesRating = !minRating || movie.vote_average >= minRating;
    const matchesGenre = !query || !genre || movie.genre_ids?.includes(Number(genre));
    const matchesLanguage = !query || !language || movie.original_language === language;
    return matchesRating && matchesGenre && matchesLanguage;
  });
}

export async function fetchSearchResults(filters: SearchFilters, page: number): Promise<SearchPage> {
  const { query, year, genre, minRating, maxRuntime, language, sort } = filters;
  const isTv = filters.type === "tv";

  const yearKey = isTv ? "first_air_date_year" : "primary_release_year";
  const yearParam = year ? `&${yearKey}=${encodeURIComponent(year)}` : "";
  const ratingParam = minRating ? `&vote_average.gte=${encodeURIComponent(minRating)}` : "";
  const genreParam = genre ? `&with_genres=${encodeURIComponent(genre)}` : "";
  const runtimeParam = !isTv && maxRuntime ? `&with_runtime.lte=${encodeURIComponent(maxRuntime)}` : "";
  const languageParam = language ? `&with_original_language=${encodeURIComponent(language)}` : "";
  const sortParam = sort ? `&sort_by=${encodeURIComponent(sort)}` : "&sort_by=popularity.desc";

  if (hasAnyFilter({ query, year, genre, minRating, maxRuntime, language, sort })) {
    // Nothing to search for.
  } else {
    return { results: [], hasMore: false };
  }

  const raw: MovieSummary[] = query
    ? (await (isTv ? searchTv(query, yearParam, page) : searchMovies(query, yearParam, page)))?.results || []
    : (await (isTv
        ? discoverTv(yearParam + ratingParam + genreParam + languageParam + sortParam, page)
        : discoverMovies(yearParam + ratingParam + genreParam + runtimeParam + languageParam + sortParam, page)
      ))?.results || [];

  return {
    results: applyClientFilters(raw, filters),
    // From the RAW page, not the filtered one: a page whose 20 upstream results
    // all fail `minRating` yields zero matches here while page 3 may well
    // contain some, and reporting "no more" on that basis would strand the user
    // with results still available.
    hasMore: raw.length > 0,
  };
}

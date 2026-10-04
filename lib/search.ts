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
    hasMore: raw.length > 0,
  };
}

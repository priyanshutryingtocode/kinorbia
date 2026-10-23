import {
  discoverMovies,
  discoverTv,
  searchMovies,
  searchTv,
} from "@/lib/tmdb";
import { mediaKey } from "@/lib/media";
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

export type SearchPage = {
  results: MovieSummary[];
  hasMore: boolean;
  nextPage: number;
  failed: boolean;
  undisplayable: boolean;
};

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

const SEARCH_PAGE_SIZE = 20;
const MAX_EMPTY_PAGES = 5;

export async function fetchSearchResults(
  filters: SearchFilters,
  page: number,
  exclude: string[] = []
): Promise<SearchPage> {
  const { query, year, genre, minRating, maxRuntime, language, sort } = filters;
  const isTv = filters.type === "tv";

  const yearKey = isTv ? "first_air_date_year" : "primary_release_year";
  const yearParam = year ? `&${yearKey}=${encodeURIComponent(year)}` : "";
  const ratingParam = minRating ? `&vote_average.gte=${encodeURIComponent(minRating)}` : "";
  const genreParam = genre ? `&with_genres=${encodeURIComponent(genre)}` : "";
  const runtimeParam = !isTv && maxRuntime ? `&with_runtime.lte=${encodeURIComponent(maxRuntime)}` : "";
  const languageParam = language ? `&with_original_language=${encodeURIComponent(language)}` : "";
  const sortParam = sort ? `&sort_by=${encodeURIComponent(sort)}` : "&sort_by=popularity.desc";

  if (!hasAnyFilter({ query, year, genre, minRating, maxRuntime, language, sort })) {
    return { results: [], hasMore: false, nextPage: 1, failed: false, undisplayable: false };
  }

  const fetchOne = (tmdbPage: number) =>
    query
      ? isTv
        ? searchTv(query, yearParam, tmdbPage)
        : searchMovies(query, yearParam, tmdbPage)
      : isTv
        ? discoverTv(yearParam + ratingParam + genreParam + languageParam + sortParam, tmdbPage)
        : discoverMovies(
            yearParam + ratingParam + genreParam + runtimeParam + languageParam + sortParam,
            tmdbPage
          );

  const seen = new Set(exclude);
  const filtered: MovieSummary[] = [];
  let displayable = 0;
  let sawMatches = false;
  let hasMore = false;
  let failed = false;
  let emptyPages = 0;
  let consumed = 0;

  for (let offset = 0; filtered.length < SEARCH_PAGE_SIZE; offset += 1) {
    consumed = offset + 1;
    const response = await fetchOne(page + offset);
    if (response === null) {
      failed = offset === 0;
      hasMore = false;
      break;
    }

    const batch = response.results || [];
    displayable += batch.length;

    if ((response.rawCount ?? batch.length) === 0) {
      hasMore = false;
      break;
    }
    sawMatches = true;

    const fresh = batch.filter((movie) => !seen.has(mediaKey(movie.mediaType, movie.id)));
    for (const movie of fresh) {
      seen.add(mediaKey(movie.mediaType, movie.id));
    }
    const accepted = applyClientFilters(fresh, filters);
    filtered.push(...accepted);

    if (accepted.length === 0) {
      emptyPages += 1;
      if (emptyPages >= MAX_EMPTY_PAGES) {
        hasMore = false;
        break;
      }
    } else {
      emptyPages = 0;
      hasMore = true;
    }
  }

  return {
    results: hasMore ? filtered.slice(0, SEARCH_PAGE_SIZE) : filtered,
    hasMore,
    nextPage: page + consumed,
    failed,
    undisplayable: !failed && sawMatches && displayable === 0 && filtered.length === 0,
  };
}

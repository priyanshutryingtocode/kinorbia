"use server";

import type { MovieSummary } from "@/types";
import {
  getPopularMovies,
  getDiscoverMovies,
  getPopularTv,
  getDiscoverTv,
  getTrendingMovies,
  getTrendingTv,
  isFetchablePage,
  TMDB_PAGE_SIZE,
} from "@/lib/tmdb";
import { mediaKey } from "@/lib/media";
import { fetchSearchResults, type SearchFilters } from "@/lib/search";
import type { TrendingWindow } from "@/types";

export type BrowsePage = {
  results: MovieSummary[];
  hasMore: boolean;
  nextPage?: number;
  failed: boolean;
};

const MAX_EMPTY_PAGES = 5;

async function loadBrowsePage(
  startPage: number,
  fetchPage: (page: number) => Promise<{ results?: MovieSummary[]; rawCount: number } | null>,
  exclude: string[]
): Promise<BrowsePage & { nextPage: number }> {
  const seen = new Set(exclude);
  const results: MovieSummary[] = [];
  let page = startPage;
  let hasMore = true;
  let failed = false;

  while (results.length < TMDB_PAGE_SIZE) {

    if (!isFetchablePage(page)) {
      hasMore = false;
      break;
    }

    const batch = await fetchPage(page);

    if (batch === null) {
      failed = true;
      break;
    }

    if (!batch.results) {
      hasMore = false;
      break;
    }

    for (const movie of batch.results) {
      const key = mediaKey(movie.mediaType, movie.id);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      results.push(movie);

      if (results.length === TMDB_PAGE_SIZE) {
        break;
      }
    }

    if (batch.rawCount === 0) {
      hasMore = false;
      break;
    }

    if (batch.results.length === 0 && page - startPage >= MAX_EMPTY_PAGES) {
      hasMore = false;
      break;
    }

    page += 1;
  }

  return { results, hasMore, nextPage: page, failed };
}

function toPageNumber(value: unknown): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

type BrowseArgs = {
  page: number;
  genre?: string;
  exclude?: string[];
};

const BROWSE_SOURCES = {
  movie: { popular: getPopularMovies, discover: getDiscoverMovies },
  tv: { popular: getPopularTv, discover: getDiscoverTv },
} as const;

type BrowseMedia = keyof typeof BROWSE_SOURCES;

function browsePage(media: BrowseMedia, { page, genre, exclude = [] }: BrowseArgs): Promise<BrowsePage> {
  const source = BROWSE_SOURCES[media];
  return loadBrowsePage(
    toPageNumber(page),
    (tmdbPage) =>
      genre ? source.discover(tmdbPage, genre) : source.popular(tmdbPage),
    exclude
  );
}

export async function fetchMovies(args: BrowseArgs): Promise<BrowsePage> {
  return browsePage("movie", args);
}

export async function fetchTvShows(args: BrowseArgs): Promise<BrowsePage> {
  return browsePage("tv", args);
}

export async function fetchTrending({
  page,
  window = "week",
  mediaType = "movie",
  exclude = [],
}: {
  page: number;
  window?: string;
  mediaType?: string;
  exclude?: string[];
}): Promise<BrowsePage> {
  const trendWindow: TrendingWindow = window === "day" ? "day" : "week";
  const media = mediaType === "tv" ? "tv" : "movie";
  const source = media === "movie" ? getTrendingMovies : getTrendingTv;

  return loadBrowsePage(toPageNumber(page), (tmdbPage) => source(trendWindow, tmdbPage), exclude);
}

export async function fetchSearchPage({
  page,
  exclude,
  ...filters
}: SearchFilters & { page: number; exclude?: string[] }) {
  return fetchSearchResults(filters, toPageNumber(page), exclude);
}

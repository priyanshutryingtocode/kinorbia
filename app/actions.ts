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

// `failed` says a page fetch was exhausted rather than empty. The browse page already
  // said "Couldn't load" on an empty grid, but it could not tell the two apart -- so a
  // title list that genuinely ran out looked the same as a TMDB outage.
export type BrowsePage = {
  results: MovieSummary[];
  hasMore: boolean;
  nextPage?: number;
  failed: boolean;
};

// One "load more" click adds exactly TMDB_PAGE_SIZE (20) *new* titles. 20 divides
  // the browse grid's 2, 4 and 5 columns; any other count leaves a short final row.
  //
  // Dedupe happens here rather than on the client: TMDB's ranking shifts between requests
  // and repeats 4-9 of every 20, leaving the total short by an arbitrary amount.
  //
  // Consequence, accepted: a page's unused tail is skipped, so titles already shown never
  // reappear. Invisible in a ten-thousand-title list; nothing is persisted either way.
  //
  // fetchPage resolves to null when TMDB is exhausted rather than throwing, so the failure
  // is read off the value and reported -- absorbing it made an outage look like the end of
  // the catalogue.
  //
  // Consecutive pages allowed to yield nothing displayable before giving up. Posterless titles
  // cluster, so one empty page is not an exhausted source -- but 500 is not an empty genre's answer either.
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

// "TMDB returned nothing" ends the source; "TMDB returned titles and none are displayable"
      // does not. The tmdb layer drops posterless titles, so a page of twenty junk entries
      // arrives as an empty list, and treating that as the end would truncate a genre.
    if (batch.rawCount === 0) {
      hasMore = false;
      break;
    }

    if (batch.results.length === 0 && page - startPage >= MAX_EMPTY_PAGES) {
      // Nothing displayable across a run of pages: stop rather than crawl the catalogue
      // for a grid that will stay empty.
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
  // `mediaKey` for every title on screen, so the action can guarantee 20 new ones.
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

// --- trending --------------------------------------------------------------

// Trending is a third source, not a fourth genre. It reuses loadBrowsePage wholesale because
// TMDB's trending endpoint behaves exactly like the others that justify it: 20 per page, and
// consecutive pages genuinely overlap (measured 12-19 new out of 20), so a bare page+1
// would repeat titles already on screen.
//
// Deliberately not routed through BROWSE_SOURCES: that table is keyed popular/discover and
// picks between them on the presence of a genre, and trending has no genre parameter at all.
//
// The window is validated here rather than trusted from the query string, because it is
// interpolated into a TMDB request path.
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

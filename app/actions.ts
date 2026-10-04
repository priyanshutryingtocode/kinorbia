"use server";

import type { MovieSummary } from "@/types";
import {
  getPopularMovies,
  getDiscoverMovies,
  getPopularTv,
  getDiscoverTv,
  isFetchablePage,
  TMDB_PAGE_SIZE,
} from "@/lib/tmdb";
import { mediaKey } from "@/lib/media";
import { fetchSearchResults, type SearchFilters } from "@/lib/search";

export type BrowsePage = { results: MovieSummary[]; hasMore: boolean; nextPage?: number };

// One "load more" click adds exactly TMDB_PAGE_SIZE (20) *new* titles.
//
// Exactly 20 matters: the browse grid is 2, 4 or 5 columns and 20 divides all
// three, so any other count leaves a short final row.
//
// Returning one page's contents is not enough. TMDB's popularity ranking shifts
// between requests, so a page fetched a second after the previous one repeats
// titles already on screen -- measured at four to nine of twenty. Client-side
// dedupe kept the cards honest but left the total at 40-minus-an-arbitrary-number,
// which is the ragged row this prevents. So the filtering happens here, where
// the count can still be corrected: the loop pulls until it holds 20 unique
// titles or the source runs out, and reports where to resume.
//
// Two consequences, both accepted. A page's unused tail is skipped, so six titles
// on page 3 that were already shown never appear -- invisible in a
// ten-thousand-title list, and nothing is persisted either way. And `fetchPage`
// may resolve to null, since `tmdbFetch` swallows transport errors rather than
// throwing, so a failure is not an exception the hook can catch.
async function loadBrowsePage(
  startPage: number,
  fetchPage: (page: number) => Promise<{ results?: MovieSummary[] } | null>,
  exclude: string[]
): Promise<BrowsePage & { nextPage: number }> {
  const seen = new Set(exclude);
  const results: MovieSummary[] = [];
  let page = startPage;
  let hasMore = true;

  while (results.length < TMDB_PAGE_SIZE) {

    if (!isFetchablePage(page)) {
      hasMore = false;
      break;
    }

    const batch = await fetchPage(page);

    if (!batch?.results) {
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

    if (batch.results.length === 0) {
      hasMore = false;
      break;
    }

    page += 1;
  }

  return { results, hasMore, nextPage: page };
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

export async function fetchSearchPage({
  page,
  ...filters
}: SearchFilters & { page: number }) {
  return fetchSearchResults(filters, toPageNumber(page));
}

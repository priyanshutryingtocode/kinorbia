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

// TMDB exposes no total count, so `hasMore` is a question about the furthest
// page reached, not a count comparison. Every action here resolves to the same
// shape because `useLoadMore` consumes it directly -- a bare array cannot
// express whether more pages exist.
//
// `nextPage` is where the next click should start reading, which is not always
// `page + 1`: the browse loop may have pulled an extra page to top up to a full
// batch, and re-reading those would fetch the same titles again.
type BrowsePage = { results: MovieSummary[]; hasMore: boolean; nextPage?: number };

// One "load more" click adds exactly TMDB_PAGE_SIZE (20) *new* titles.
//
// Exactly 20 matters: the browse grid is 2, 4 or 5 columns, and 20 divides all
// three, so a click that added any other count would leave a short final row.
//
// Fetching one page and returning whatever it holds is not enough on its own.
// TMDB's popularity ranking shifts between requests, so a page fetched a second
// after the previous one routinely repeats titles already on screen -- measured
// at four to nine of twenty in practice. Dedupe on the client kept the cards
// honest but left the visible total at 40-minus-an-arbitrary-number, which is
// exactly the ragged row this is meant to prevent.
//
// So the filtering happens here, where the count can still be corrected: the
// loop keeps pulling pages until it has a full 20 unique titles or the source
// genuinely runs out, and reports the page to resume from so the pages it read to
// top up are not fetched again.
//
// A consequence, accepted: a page's unused tail is skipped. If page 3 has six
// titles already shown, this takes its other fourteen and moves to page 4, so
// those six never appear. In a ten-thousand-title popularity list that is
// invisible, and nothing is persisted either way.
//
// `fetchPage` may resolve to null: `tmdbFetch` swallows transport errors and
// returns null, so a failure is not an exception the hook can catch.
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
    // Past TMDB's page ceiling. Reported as a finished list so the button
    // disappears rather than looping on whatever `safePage` folded the request to.
    if (!isFetchablePage(page)) {
      hasMore = false;
      break;
    }

    const batch = await fetchPage(page);

    // A response that is not a well-formed page is "unknown", not "the end of
    // the list", and must not remove the button permanently. Testing `!results`
    // rather than `=== null` covers all three ways it goes wrong: a transport
    // error (null), a body without the key, and a fetcher resolving to undefined.
    // An empty array is truthy, so a genuinely empty page still falls through to
    // the end-of-list check below -- and TMDB exposes no total count, so an empty
    // page is the only end-of-list signal there is. Note that this breaks
    // *before* `page` is incremented, so the retry re-reads the failed page.
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

// A server action is a public HTTP endpoint, so its arguments arrive from the
// wire and arrive unvalidated. `isFetchablePage` and `safePage` both fold a
// bad page to page 1 rather than throwing, so without this a crafted call would
// quietly get page 1's contents back rather than an error. Coercing here means
// the invariant is enforced once, at the boundary, instead of being assumed by
// each browse action.
function toPageNumber(value: unknown): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

export async function fetchMovies({
  page,
  genre,
  exclude = [],
}: {
  page: number;
  genre?: string;
  // `mediaKey` strings for every title already on screen. Sent by the grid so
  // the action can guarantee a click adds 20 titles it has not already shown.
  exclude?: string[];
}): Promise<BrowsePage> {
  return loadBrowsePage(
    toPageNumber(page),
    (tmdbPage) =>
      genre ? getDiscoverMovies(tmdbPage, genre) : getPopularMovies(tmdbPage),
    exclude
  );
}

export async function fetchTvShows({
  page,
  genre,
  exclude = [],
}: {
  page: number;
  genre?: string;
  // See `fetchMovies`.
  exclude?: string[];
}): Promise<BrowsePage> {
  return loadBrowsePage(
    toPageNumber(page),
    (tmdbPage) => (genre ? getDiscoverTv(tmdbPage, genre) : getPopularTv(tmdbPage)),
    exclude
  );
}

export async function fetchSearchPage({
  page,
  ...filters
}: SearchFilters & { page: number }) {
  return fetchSearchResults(filters, toPageNumber(page));
}

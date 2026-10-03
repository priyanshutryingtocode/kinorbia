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
// page reached, not a count comparison. Every action resolves to this shape
// because `useLoadMore` consumes it directly.
//
// `nextPage` is where the next click resumes, which is not always `page + 1`: the
// browse loop may have pulled an extra page to top up, and re-reading it would
// fetch the same titles again.
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
    // Past TMDB's page ceiling: reported as finished so the button disappears
    // rather than looping on whatever `safePage` folded the request to.
    if (!isFetchablePage(page)) {
      hasMore = false;
      break;
    }

    const batch = await fetchPage(page);

    // A malformed page is "unknown", not "the end", and must not remove the
    // button permanently. Testing `!results` rather than `=== null` covers all
    // three failure shapes: null, a body without the key, and undefined. An empty
    // array is truthy, so a genuinely empty page falls through to the end-of-list
    // check below -- the only signal available, since TMDB has no total. This
    // breaks *before* `page` increments, so a retry re-reads the failed page.
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

// A server action is a public endpoint, so its arguments arrive unvalidated, and
// both `isFetchablePage` and `safePage` fold a bad page to 1 rather than throwing
// -- a crafted call would quietly get page 1 back instead of an error. Coercing
// here enforces the invariant once, at the boundary, rather than in each action.
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

// The four browse endpoints behind two actions. These were four near-identical
// pairs of functions -- fetchMovies and fetchTvShows differed only in which
// discover/popular pair they reached for -- and nothing tied the action to the
// page that uses it. If the two ever disagreed, /movies and /shows would stop
// loading the same number of titles per click, which is exactly what the
// "exactly 20" rule in loadBrowsePage exists to prevent.
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

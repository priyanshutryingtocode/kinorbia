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

export type SearchPage = {
  results: MovieSummary[];
  hasMore: boolean;
  // One logical page spans several TMDB pages, so this -- not page+1 -- is the resume point.
  nextPage: number;
  failed: boolean;
  // TMDB matched, but the tmdb layer dropped every title for want of a poster or date.
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

// One "load more" of search results. 20 is 4 rows of 5 and divides every column count
// `.poster-grid` uses (2, 4, 5), so a full page fills its last row at every breakpoint.
// Same rule and constant as browse; change one without the other and the short row returns.
const SEARCH_PAGE_SIZE = 20;

// Consecutive TMDB pages allowed to yield nothing usable before giving up, so an obscure
// query cannot crawl the whole catalogue.
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

  if (hasAnyFilter({ query, year, genre, minRating, maxRuntime, language, sort })) {
    // Nothing to search for.
  } else {
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

  // Fill to SEARCH_PAGE_SIZE by walking TMDB pages. The count that has to land on 20 is the
  // post-filter one: the tmdb layer drops posterless titles and applyClientFilters drops some
  // of what is left, so counting raw would leave the final row ragged again.
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

    // `null` is an exhausted fetch. Reading it as [] conflated an outage with "nothing
    // matched", telling a member looking up a real film that it does not exist.
    if (response === null) {
      failed = offset === 0;
      hasMore = false;
      break;
    }

    const batch = response.results || [];
    displayable += batch.length;

    // rawCount 0 means the source is exhausted. A page that arrived full and was then
    // filtered down is not exhaustion -- that is what the emptyPages run is for.
    if ((response.rawCount ?? batch.length) === 0) {
      hasMore = false;
      break;
    }
    sawMatches = true;

    // The server-rendered batch and the client's cursor overlap; MovieGrid gets this from
    // seedKeys and search had no equivalent, so every click repeated a page.
    const fresh = batch.filter((movie) => !seen.has(`${movie.mediaType ?? "movie"}:${movie.id}`));
    for (const movie of fresh) {
      seen.add(`${movie.mediaType ?? "movie"}:${movie.id}`);
    }
    const accepted = applyClientFilters(fresh, filters);
    filtered.push(...accepted);

    // Progress is what reached the grid, so a renderable page that fails a filter counts as
    // empty rather than as a step toward 20.
    if (accepted.length === 0) {
      emptyPages += 1;
      if (emptyPages >= MAX_EMPTY_PAGES) {
        hasMore = false;
        break;
      }
    } else {
      emptyPages = 0;
      // Every break above sets hasMore false, so falling out of the loop means there may be more.
      hasMore = true;
    }
  }

  return {
    // Batches overshoot the target: 8 per page against 20 lands on 24, ragged again. The few
    // titles trimmed fall into the gap before `nextPage` and are not shown.
    results: hasMore ? filtered.slice(0, SEARCH_PAGE_SIZE) : filtered,
    hasMore,
    nextPage: page + consumed,
    failed,
    // Gated on sawMatches so a query that genuinely matched nothing still gets the empty
    // state rather than being told its matches were unrenderable.
    undisplayable: !failed && sawMatches && displayable === 0 && filtered.length === 0,
  };
}

import type {
  MovieSummary,
  TmdbMovieDetails,
  TmdbMovieCredits,
  TmdbTvDetails,
  TmdbTvCredits,
  TmdbVideo,
  TmdbWatchProviders,
  WatchProvider,
  TrendingWindow,
} from "@/types";
import { fetchJsonWithRetry } from "@/lib/httpRetry";
import { logger } from "@/lib/logger";

const BASE = "https://api.themoviedb.org/3";

const RETRIABLE_STATUS = new Set([429, 500, 502, 503, 504]);

function getApiKey(): string {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    throw new Error("Missing TMDB_API_KEY. Add it to the server environment.");
  }
  return apiKey;
}

async function tmdbFetch<T>(
  path: string,
  revalidate: number | false = 3600,
  retries = 2
): Promise<T | null> {
  const separator = path.includes("?") ? "&" : "?";
  const url = `${BASE}${path}${separator}api_key=${encodeURIComponent(getApiKey())}`;

  const outcome = await fetchJsonWithRetry<T>(
    url,
    { next: revalidate === false ? undefined : { revalidate } },
    {
      retries,
      retryStatuses: RETRIABLE_STATUS,
        onExhausted: ({ url: failed, attempts, status, cause }) => {
          logger.warn("TMDB gave up", {
            url: failed,
            attempts,
            status,
            cause: status === null ? describeCause(cause) : undefined,
          });
        },
    }
  );

  return outcome.ok ? outcome.data : null;
}

function describeCause(cause: unknown): string {
  if (typeof cause !== "object" || cause === null || !("cause" in cause)) {
    return cause instanceof Error ? cause.message : String(cause);
  }

  const inner = (cause as { cause?: unknown }).cause;
  if (typeof inner === "object" && inner !== null && "code" in inner) {
    const code = (inner as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }

  return cause instanceof Error ? cause.message : String(cause);
}

type ResultList<T> = { results?: T[] };

type MediaPath = "movie" | "tv";

const MAX_TMDB_PAGE = 500;

export const TMDB_PAGE_SIZE = 20;

function safePage(page: unknown) {
  const n = Number(page);
  return Number.isInteger(n) && n >= 1 && n <= MAX_TMDB_PAGE ? n : 1;
}

export function isFetchablePage(page: unknown): boolean {
  const n = Number(page);
  return Number.isInteger(n) && n >= 1 && n <= MAX_TMDB_PAGE;
}

function safeGenre(genre: string | undefined) {
  if (!genre) {
    return "";
  }
  const n = Number(genre);
  return Number.isInteger(n) && n > 0 ? String(n) : "";
}

function safeId(id: string | number) {
  const digits = String(id).replace(/[^0-9]/g, "");
  return digits || "0";
}

type RawTvResult = {
  id: number;
  name?: string;
  poster_path?: string | null;
  first_air_date?: string;
  vote_average?: number;
  genre_ids?: number[];
  original_language?: string;
};

function normalizeTvResult(result: RawTvResult): MovieSummary {
  return {
    id: result.id,
    title: result.name || "Unknown",
    poster_path: result.poster_path ?? null,
    release_date: result.first_air_date,
    vote_average: result.vote_average || 0,
    genre_ids: result.genre_ids,
    original_language: result.original_language,
    mediaType: "tv",
  };
}

function isDisplayable(movie: MovieSummary) {
  return Boolean(movie.poster_path && movie.release_date);
}

function fetchSubResource<T>(mediaType: MediaPath, id: string, resource: string, revalidate = 3600) {
  return tmdbFetch<T>(`/${mediaType}/${safeId(id)}/${resource}?language=en-US`, revalidate);
}

async function fetchDetailsWithStatus<T>(
  mediaType: MediaPath,
  id: string
): Promise<{ details: T | null; notFound: boolean }> {
  const url = `${BASE}/${mediaType}/${safeId(id)}?api_key=${encodeURIComponent(getApiKey())}`;

  const outcome = await fetchJsonWithRetry<T>(
    url,
    { next: { revalidate: 3600 } },
    {
      retryStatuses: RETRIABLE_STATUS,
        onExhausted: ({ url: failed, attempts, status, cause }) => {
          logger.warn("TMDB details gave up", {
            url: failed,
            attempts,
            status,
            cause: status === null ? describeCause(cause) : undefined,
          });
        },
    }
  );

  if (outcome.ok) {
    return { details: outcome.data, notFound: false };
  }

  return { details: null, notFound: outcome.status === 404 };
}

function discoverQuery(genre: string | undefined, page: number) {
  const genreParam = safeGenre(genre);
  return `${genreParam ? `with_genres=${genreParam}&` : ""}language=en-US&page=${safePage(page)}`;
}

type FilteredList<T> = { results: T[]; rawCount: number };

const asSummaries = (data: ResultList<RawTvResult> | null): FilteredList<MovieSummary> | null =>
  data === null
    ? null
    : (() => {
        const all = data.results?.map(normalizeTvResult) || [];
        return { results: all.filter(isDisplayable), rawCount: all.length };
      })();

function fetchNormalizedList(mediaType: MediaPath, path: string, revalidate: number) {
  if (mediaType === "tv") {
    return tmdbFetch<ResultList<RawTvResult>>(path, revalidate).then(asSummaries);
  }

  return tmdbFetch<ResultList<MovieSummary>>(path, revalidate).then((data) => {
    if (data === null) return null;
    const all = data.results || [];
    return { results: all.filter(isDisplayable), rawCount: all.length };
  });
}

function discoverByGenre(mediaType: MediaPath, genre: string | undefined, page: number) {
  return fetchNormalizedList(
    mediaType,
    `/discover/${mediaType}?${discoverQuery(genre, page)}`,
    300
  );
}

function discoverWithParams(mediaType: MediaPath, extraParams: string, page: number) {
  const params = extraParams.replace(/^&/, "");
  return fetchNormalizedList(
    mediaType,
    `/discover/${mediaType}?${params ? `${params}&` : ""}language=en-US&page=${safePage(page)}`,
    300
  );
}

function searchByQuery(mediaType: MediaPath, query: string, extraParams: string, page: number) {
  return fetchNormalizedList(
    mediaType,
    `/search/${mediaType}?query=${encodeURIComponent(query)}${extraParams}&page=${safePage(page)}`,
    3600
  );
}

export function getRecommendations(id: string, mediaType: MediaPath) {
  return recommendations(mediaType, id);
}

function recommendations(mediaType: MediaPath, id: string) {
  return fetchNormalizedList(
    mediaType,
    `/${mediaType}/${safeId(id)}/recommendations?language=en-US&page=1`,
    3600
  );
}

export const getPopularMovies = (page = 1) =>
  fetchNormalizedList(
    "movie",
    `/movie/popular?language=en-US&page=${safePage(page)}`,
    300
  );

export const getDiscoverMovies = (page = 1, genre?: string) =>
  discoverByGenre("movie", genre, page);

export const discoverMovies = (extraParams = "", page = 1) =>
  discoverWithParams("movie", extraParams, page);

export const searchMovies = (query: string, extraParams = "", page = 1) =>
  searchByQuery("movie", query, extraParams, page);

export async function getMovieWithStatus(id: string): Promise<{
  movie: TmdbMovieDetails | null;
  notFound: boolean;
}> {
  const { details, notFound } = await fetchDetailsWithStatus<TmdbMovieDetails>("movie", id);
  return { movie: details, notFound };
}

export const getMovieCredits = (id: string) =>
  fetchSubResource<TmdbMovieCredits | null>("movie", id, "credits");

export const getMovieVideos = (id: string) =>
  fetchSubResource<{ results?: TmdbVideo[] } | null>("movie", id, "videos");

export const getMovieProviders = (id: string) =>
  fetchSubResource<TmdbWatchProviders | null>("movie", id, "watch/providers");

export const getTrendingMovies = (window: TrendingWindow = "week", page = 1) =>
  fetchNormalizedList(
    "movie",
    `/trending/movie/${window}?language=en-US&page=${safePage(page)}`,
    900
  );

export const getTrendingTv = (window: TrendingWindow = "week", page = 1) =>
  fetchNormalizedList("tv", `/trending/tv/${window}?language=en-US&page=${safePage(page)}`, 900);


export const getPopularTv = (page = 1) =>
  fetchNormalizedList(
    "tv",
    `/tv/popular?language=en-US&page=${safePage(page)}`,
    300
  );

export const getDiscoverTv = (page = 1, genre?: string) => discoverByGenre("tv", genre, page);

export const discoverTv = (extraParams = "", page = 1) =>
  discoverWithParams("tv", extraParams, page);

export const searchTv = (query: string, extraParams = "", page = 1) =>
  searchByQuery("tv", query, extraParams, page);

export async function getTvWithStatus(id: string): Promise<{
  tv: TmdbTvDetails | null;
  notFound: boolean;
}> {
  const { details, notFound } = await fetchDetailsWithStatus<TmdbTvDetails>("tv", id);
  return { tv: details, notFound };
}

export const getTvCredits = (id: string) =>
  fetchSubResource<TmdbTvCredits | null>("tv", id, "credits");

export const getTvVideos = (id: string) =>
  fetchSubResource<{ results?: TmdbVideo[] } | null>("tv", id, "videos");

export const getTvProviders = (id: string) =>
  fetchSubResource<TmdbWatchProviders | null>("tv", id, "watch/providers");


export function summarizeWatchProviders(
  payload: TmdbWatchProviders | null,
  region: string
): WatchProvider[] {
  const offers = payload?.results?.[region];
  if (!offers) return [];

  const seen = new Set<string>();
  const providers: WatchProvider[] = [];

  for (const entry of offers.flatrate ?? []) {
    if (!entry?.provider_name || seen.has(entry.provider_name)) continue;
    seen.add(entry.provider_name);
    providers.push({ name: entry.provider_name, kind: "stream", logoPath: entry.logo_path ?? null });
  }
  for (const entry of offers.rent ?? []) {
    if (!entry?.provider_name || seen.has(entry.provider_name)) continue;
    seen.add(entry.provider_name);
    providers.push({ name: entry.provider_name, kind: "rent", logoPath: entry.logo_path ?? null });
  }
  for (const entry of offers.buy ?? []) {
    if (!entry?.provider_name || seen.has(entry.provider_name)) continue;
    seen.add(entry.provider_name);
    providers.push({ name: entry.provider_name, kind: "buy", logoPath: entry.logo_path ?? null });
  }

  return providers;
}

export function hasWatchProviderData(payload: TmdbWatchProviders | null): boolean {
  const results = payload?.results;
  if (!results) return false;

  return Object.values(results).some((offers) =>
    Boolean(offers.flatrate?.length || offers.rent?.length || offers.buy?.length)
  );
}



export function pickMainTrailer(videos: TmdbVideo[] | undefined | null): TmdbVideo | null {
  if (!videos || videos.length === 0) {
    return null;
  }

  const youtube = videos.filter((video) => video.site === "YouTube" && video.key);
  if (youtube.length === 0) {
    return null;
  }

  const byNewest = (a: TmdbVideo, b: TmdbVideo) =>
    (b.published_at || "").localeCompare(a.published_at || "");

  const byType = (types: string[]) =>
    [...youtube]
      .filter((video) => types.includes(video.type))
      .sort((a, b) => Number(Boolean(b.official)) - Number(Boolean(a.official)) || byNewest(a, b))[0] || null;

  return (
    byType(["Trailer"]) ||
    byType(["Teaser"]) ||
    byType(["Clip", "Featurette", "Behind the Scenes"]) ||
    [...youtube].sort(byNewest)[0]
  );
}

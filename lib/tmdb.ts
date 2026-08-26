import type {
  MovieSummary,
  TmdbMovieDetails,
  TmdbMovieCredits,
  TmdbTvDetails,
  TmdbTvCredits,
  TmdbVideo,
} from "@/types";

const BASE = "https://api.themoviedb.org/3";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const RETRIABLE_STATUS = new Set([429, 500, 502, 503, 504]);

function shouldRetryStatus(status: number) {
  return RETRIABLE_STATUS.has(status);
}

async function tmdbFetch<T>(
  path: string,
  revalidate: number | false = 3600,
  retries = 2
): Promise<T | null> {
  const separator = path.includes("?") ? "&" : "?";
  const url = `${BASE}${path}${separator}api_key=${process.env.TMDB_API_KEY}`;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    let controller: AbortController | undefined;

    try {
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 8000);

      const res = await fetch(url, {
        next: revalidate === false ? undefined : { revalidate },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        if (attempt === retries || !shouldRetryStatus(res.status)) {
          return null;
        }
      } else {
        return (await res.json()) as T;
      }
    } catch {
      if (attempt === retries) {
        return null;
      }
    }

    await sleep(350 * (attempt + 1));
  }

  return null;
}

type ResultList<T> = { results?: T[] };

type MediaPath = "movie" | "tv";

// Coerce untrusted page/genre values into safe URL fragments.
function safePage(page: unknown) {
  const n = Number(page);
  return Number.isInteger(n) && n >= 1 && n <= 500 ? n : 1;
}

function safeGenre(genre: string | undefined) {
  if (!genre) {
    return "";
  }
  const n = Number(genre);
  return Number.isInteger(n) && n > 0 ? String(n) : "";
}

// TMDB ids are numeric; strip everything else so route params can't alter
// the request path.
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

// Shared list/detail/sub-resource fetchers. TV responses are normalized into
// MovieSummary shape (name -> title, first_air_date -> release_date); movie
// responses already match and are returned untouched.
function fetchList(mediaType: MediaPath, endpoint: string, revalidate: number) {
  if (mediaType === "tv") {
    return tmdbFetch<ResultList<RawTvResult>>(`/tv/${endpoint}`, revalidate).then((data) => ({
      results: data?.results?.map(normalizeTvResult) || [],
    }));
  }

  return tmdbFetch<ResultList<MovieSummary>>(`/movie/${endpoint}`, revalidate);
}

function fetchSubResource<T>(mediaType: MediaPath, id: string, resource: string, revalidate = 3600) {
  return tmdbFetch<T>(`/${mediaType}/${safeId(id)}/${resource}?language=en-US`, revalidate);
}

async function fetchDetailsWithStatus<T>(
  mediaType: MediaPath,
  id: string
): Promise<{ details: T | null; notFound: boolean }> {
  const url = `${BASE}/${mediaType}/${safeId(id)}?api_key=${process.env.TMDB_API_KEY}`;

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });

    if (res.status === 404) {
      return { details: null, notFound: true };
    }

    if (!res.ok) {
      return { details: null, notFound: false };
    }

    return { details: (await res.json()) as T, notFound: false };
  } catch {
    return { details: null, notFound: false };
  }
}

function discoverQuery(genre: string | undefined, page: number) {
  const genreParam = safeGenre(genre);
  return `${genreParam ? `with_genres=${genreParam}&` : ""}language=en-US&page=${safePage(page)}`;
}

// --- Movies ---

export const getPopularMovies = (page = 1) =>
  fetchList("movie", `popular?language=en-US&page=${safePage(page)}`, 300);

export const getDiscoverMovies = (page = 1, genre?: string) =>
  fetchList("movie", `discover/movie?${discoverQuery(genre, page)}`, 300);

export const discoverMovies = (extraParams = "", page = 1) => {
  const params = extraParams.replace(/^&/, "");
  return tmdbFetch<ResultList<MovieSummary>>(
    `/discover/movie?${params ? `${params}&` : ""}language=en-US&page=${page}`,
    300
  );
};

export const searchMovies = (query: string, extraParams = "") =>
  tmdbFetch<ResultList<MovieSummary>>(
    `/search/movie?query=${encodeURIComponent(query)}${extraParams}`,
    3600
  );

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

export const getRecommendationMovies = (id: string) =>
  tmdbFetch<ResultList<MovieSummary>>(`/movie/${safeId(id)}/recommendations?language=en-US&page=1`, 3600);

// --- TV ---

export const getPopularTv = (page = 1) =>
  fetchList("tv", `popular?language=en-US&page=${safePage(page)}`, 300);

export const getDiscoverTv = (page = 1, genre?: string) =>
  fetchList("tv", `discover/tv?${discoverQuery(genre, page)}`, 300);

export const discoverTv = (extraParams = "", page = 1) => {
  const params = extraParams.replace(/^&/, "");
  return tmdbFetch<ResultList<RawTvResult>>(
    `/discover/tv?${params ? `${params}&` : ""}language=en-US&page=${page}`,
    300
  ).then((data) => ({
    results: data?.results?.map(normalizeTvResult) || [],
  }));
};

export const searchTv = (query: string, extraParams = "") =>
  tmdbFetch<ResultList<RawTvResult>>(
    `/search/tv?query=${encodeURIComponent(query)}${extraParams}`,
    3600
  ).then((data) => ({
    results: data?.results?.map(normalizeTvResult) || [],
  }));

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

export const getTvRecommendations = (id: string) =>
  tmdbFetch<ResultList<RawTvResult>>(`/tv/${safeId(id)}/recommendations?language=en-US&page=1`, 3600).then(
    (data) => ({
      results: data?.results?.map(normalizeTvResult) || [],
    })
  );

// Prefer the newest official YouTube trailer, falling back through any
// trailer, teaser, clip, and finally whatever exists.
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

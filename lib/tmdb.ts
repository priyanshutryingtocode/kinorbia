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

export const getPopularMovies = (page = 1) =>
  tmdbFetch<ResultList<MovieSummary>>(`/movie/popular?language=en-US&page=${safePage(page)}`, 300);

export const getDiscoverMovies = (page = 1, genre?: string) => {
  const genreParam = safeGenre(genre);
  return tmdbFetch<ResultList<MovieSummary>>(
    `/discover/movie?${genreParam ? `with_genres=${genreParam}&` : ""}language=en-US&page=${safePage(page)}`,
    300
  );
};

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

export const getMovie = (id: string) => tmdbFetch<TmdbMovieDetails>(`/movie/${safeId(id)}`, 3600);

export async function getMovieWithStatus(id: string): Promise<{
  movie: TmdbMovieDetails | null;
  notFound: boolean;
}> {
  const url = `${BASE}/movie/${safeId(id)}?api_key=${process.env.TMDB_API_KEY}`;

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });

    if (res.status === 404) {
      return { movie: null, notFound: true };
    }

    if (!res.ok) {
      return { movie: null, notFound: false };
    }

    return { movie: (await res.json()) as TmdbMovieDetails, notFound: false };
  } catch {
    return { movie: null, notFound: false };
  }
}

export const getMovieCredits = (id: string) =>
  tmdbFetch<TmdbMovieCredits | null>(`/movie/${safeId(id)}/credits?language=en-US`, 3600);

export const getMovieVideos = (id: string) =>
  tmdbFetch<{ results?: TmdbVideo[] } | null>(`/movie/${safeId(id)}/videos?language=en-US`, 3600);

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

export const getRecommendationMovies = (id: string) =>
  tmdbFetch<ResultList<MovieSummary>>(`/movie/${safeId(id)}/recommendations?language=en-US&page=1`, 3600);

type RawTvResult = {
  id: number;
  name?: string;
  poster_path?: string | null;
  first_air_date?: string;
  vote_average?: number;
  genre_ids?: number[];
  original_language?: string;
};

export function normalizeTvResult(result: RawTvResult): MovieSummary {
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

export const getPopularTv = (page = 1) =>
  tmdbFetch<ResultList<RawTvResult>>(`/tv/popular?language=en-US&page=${safePage(page)}`, 300).then((data) => ({
    results: data?.results?.map(normalizeTvResult) || [],
  }));

export const getDiscoverTv = (page = 1, genre?: string) => {
  const genreParam = safeGenre(genre);
  return tmdbFetch<ResultList<RawTvResult>>(
    `/discover/tv?${genreParam ? `with_genres=${genreParam}&` : ""}language=en-US&page=${safePage(page)}`,
    300
  ).then((data) => ({
    results: data?.results?.map(normalizeTvResult) || [],
  }));
};

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

export const getTv = (id: string) => tmdbFetch<TmdbTvDetails>(`/tv/${safeId(id)}`, 3600);

export async function getTvWithStatus(id: string): Promise<{
  tv: TmdbTvDetails | null;
  notFound: boolean;
}> {
  const url = `${BASE}/tv/${safeId(id)}?api_key=${process.env.TMDB_API_KEY}`;

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });

    if (res.status === 404) {
      return { tv: null, notFound: true };
    }

    if (!res.ok) {
      return { tv: null, notFound: false };
    }

    return { tv: (await res.json()) as TmdbTvDetails, notFound: false };
  } catch {
    return { tv: null, notFound: false };
  }
}

export const getTvCredits = (id: string) =>
  tmdbFetch<TmdbTvCredits | null>(`/tv/${safeId(id)}/credits?language=en-US`, 3600);

export const getTvVideos = (id: string) =>
  tmdbFetch<{ results?: TmdbVideo[] } | null>(`/tv/${safeId(id)}/videos?language=en-US`, 3600);

export const getTvRecommendations = (id: string) =>
  tmdbFetch<ResultList<RawTvResult>>(`/tv/${safeId(id)}/recommendations?language=en-US&page=1`, 3600).then(
    (data) => ({
      results: data?.results?.map(normalizeTvResult) || [],
    })
  );
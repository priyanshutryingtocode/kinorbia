import type { MovieSummary, TmdbMovieDetails, TmdbMovieCredits, TmdbTvDetails, TmdbTvCredits } from "@/types";

const BASE = "https://api.themoviedb.org/3";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function tmdbFetch<T>(
  path: string,
  revalidate: number | false = 3600,
  retries = 0
): Promise<T | null> {
  const separator = path.includes("?") ? "&" : "?";
  const url = `${BASE}${path}${separator}api_key=${process.env.TMDB_API_KEY}`;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(url, {
        next: revalidate === false ? undefined : { revalidate },
      });

      if (!res.ok) {
        return null;
      }

      return (await res.json()) as T;
    } catch {
      if (attempt === retries) {
        return null;
      }

      await sleep(350);
    }
  }

  return null;
}

type ResultList<T> = { results?: T[] };

export const getPopularMovies = (page = 1) =>
  tmdbFetch<ResultList<MovieSummary>>(`/movie/popular?language=en-US&page=${page}`, 3600);

export const getDiscoverMovies = (page = 1, genre?: string) =>
  tmdbFetch<ResultList<MovieSummary>>(
    `/discover/movie?with_genres=${genre}&language=en-US&page=${page}`,
    3600
  );

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

export const getMovie = (id: string) => tmdbFetch<TmdbMovieDetails>(`/movie/${id}`, 3600);

export async function getMovieWithStatus(id: string): Promise<{
  movie: TmdbMovieDetails | null;
  notFound: boolean;
}> {
  const url = `${BASE}/movie/${id}?api_key=${process.env.TMDB_API_KEY}`;

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
  tmdbFetch<TmdbMovieCredits | null>(`/movie/${id}/credits?language=en-US`, 3600);

export const getRecommendationMovies = (id: string) =>
  tmdbFetch<ResultList<MovieSummary>>(`/movie/${id}/recommendations?language=en-US&page=1`, 3600);

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
  tmdbFetch<ResultList<RawTvResult>>(`/tv/popular?language=en-US&page=${page}`, 3600).then((data) => ({
    results: data?.results?.map(normalizeTvResult) || [],
  }));

export const getDiscoverTv = (page = 1, genre?: string) =>
  tmdbFetch<ResultList<RawTvResult>>(
    `/discover/tv?with_genres=${genre}&language=en-US&page=${page}`,
    3600
  ).then((data) => ({
    results: data?.results?.map(normalizeTvResult) || [],
  }));

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

export const getTv = (id: string) => tmdbFetch<TmdbTvDetails>(`/tv/${id}`, 3600);

export async function getTvWithStatus(id: string): Promise<{
  tv: TmdbTvDetails | null;
  notFound: boolean;
}> {
  const url = `${BASE}/tv/${id}?api_key=${process.env.TMDB_API_KEY}`;

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
  tmdbFetch<TmdbTvCredits | null>(`/tv/${id}/credits?language=en-US`, 3600);

export const getTvRecommendations = (id: string) =>
  tmdbFetch<ResultList<RawTvResult>>(`/tv/${id}/recommendations?language=en-US&page=1`, 3600).then(
    (data) => ({
      results: data?.results?.map(normalizeTvResult) || [],
    })
  );
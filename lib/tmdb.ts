import type { MovieSummary, TmdbMovieDetails, TmdbMovieCredits } from "@/types";

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
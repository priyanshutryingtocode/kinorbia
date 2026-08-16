"use server";

import type { MovieSummary } from "@/types";
import { getPopularMovies, getDiscoverMovies, getPopularTv, getDiscoverTv } from "@/lib/tmdb";

export async function fetchMovies(page: number, genre?: string): Promise<MovieSummary[]> {
  const data = genre
    ? await getDiscoverMovies(page, genre)
    : await getPopularMovies(page);

  return data?.results || [];
}

export async function fetchTvShows(page: number, genre?: string): Promise<MovieSummary[]> {
  const data = genre
    ? await getDiscoverTv(page, genre)
    : await getPopularTv(page);

  return data?.results || [];
}
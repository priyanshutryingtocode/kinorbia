"use server";

import type { MovieSummary } from "@/types";

type TmdbMovieResponse = {
  results: MovieSummary[];
};

export async function fetchMovies(page: number, genre?: string): Promise<MovieSummary[]> {
  // Dynamically build the URL based on whether a genre was passed in
  const tmdbUrl = genre
    ? `https://api.themoviedb.org/3/discover/movie?api_key=${process.env.TMDB_API_KEY}&with_genres=${genre}&language=en-US&page=${page}`
    : `https://api.themoviedb.org/3/movie/popular?api_key=${process.env.TMDB_API_KEY}&language=en-US&page=${page}`;

  const res = await fetch(tmdbUrl, { 
    next: { revalidate: 3600 } 
  });
  
  // Gracefully handle any API errors
  if (!res.ok) {
    return [];
  }
  
  const data = (await res.json()) as TmdbMovieResponse;
  return data.results || [];
}
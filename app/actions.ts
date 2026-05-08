"use server";

import type { MovieSummary } from "@/types";

type TmdbMovieResponse = {
  results: MovieSummary[];
};

export async function fetchMovies(page: number): Promise<MovieSummary[]> {
  const res = await fetch(
    `https://api.themoviedb.org/3/movie/popular?api_key=${process.env.TMDB_API_KEY}&language=en-US&page=${page}`,
    { next: { revalidate: 3600 } }
  );
  
  const data = (await res.json()) as TmdbMovieResponse;
  return data.results;
}

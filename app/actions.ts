"use server";

export async function fetchMovies(page: number) {
  const res = await fetch(
    `https://api.themoviedb.org/3/movie/popular?api_key=${process.env.TMDB_API_KEY}&language=en-US&page=${page}`,
    { next: { revalidate: 3600 } } // Cache for 1 hour
  );
  
  const data = await res.json();
  return data.results;
}
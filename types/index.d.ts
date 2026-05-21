export type MovieSummary = {
  id: number | string;
  title: string;
  poster_path: string | null;
  release_date?: string;
  vote_average: number;
  personalRating?: number;
};

export type FavoriteMovie = {
  movieId: string;
  title: string;
  posterPath: string | null;
  voteAverage: number;
  releaseDate?: string;
  personalRating?: number;
};

export type TmdbMovieDetails = MovieSummary & {
  backdrop_path: string | null;
  overview: string;
  release_date: string;
  runtime: number;
  tagline: string;
};

export type ReviewItem = {
  _id: string;
  userEmail: string;
  userName: string;
  movieTitle: string;
  posterPath?: string | null;
  rating: number;
  body: string;
  visibility: "public" | "private";
  createdAt: string;
};

export type MovieListItem = {
  _id: string;
  userEmail: string;
  userName: string;
  title: string;
  description?: string;
  movies: FavoriteMovie[];
  visibility: "public" | "private";
  createdAt: string;
};

export type JournalItem = {
  _id: string;
  movieTitle: string;
  posterPath?: string | null;
  rating?: number;
  watchedAt: string;
  note?: string;
  createdAt: string;
};

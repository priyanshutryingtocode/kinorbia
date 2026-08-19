export type MediaType = "movie" | "tv";

export type MovieSummary = {
  id: number | string;
  title: string;
  poster_path: string | null;
  release_date?: string;
  vote_average: number;
  personalRating?: number;
  genre_ids?: number[];
  original_language?: string;
  mediaType?: MediaType;
};

export type FavoriteMovie = {
  movieId: string;
  title: string;
  posterPath: string | null;
  voteAverage: number;
  releaseDate?: string;
  personalRating?: number;
  mediaType?: MediaType;
  genreIds?: number[];
  addedAt?: string;
};

export type WatchlistMovie = FavoriteMovie;

export type ListMovie = {
  movieId: string;
  title: string;
  posterPath: string | null;
  voteAverage: number;
  releaseDate?: string;
  mediaType?: MediaType;
};

export type TmdbMovieDetails = MovieSummary & {
  backdrop_path: string | null;
  overview: string;
  release_date: string;
  runtime: number;
  tagline: string;
  genres?: { id: number; name: string }[];
};

export type TmdbCredit = {
  id: number;
  name: string;
  character?: string;
  job?: string;
  department?: string;
  profile_path: string | null;
  order?: number;
};

export type TmdbMovieCredits = {
  id: number;
  cast: TmdbCredit[];
  crew: TmdbCredit[];
};

export type TmdbTvDetails = {
  id: number | string;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  first_air_date: string;
  vote_average: number;
  tagline: string;
  genres?: { id: number; name: string }[];
  networks?: { id: number; name: string }[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  status?: string;
};

export type TmdbTvCredits = {
  id: number;
  cast: TmdbCredit[];
  crew: TmdbCredit[];
};

export type ReviewItem = {
  _id: string;
  userEmail: string;
  userName: string;
  movieTitle: string;
  posterPath?: string | null;
  body: string;
  visibility: "public" | "private";
  spoiler?: boolean;
  movieId?: string;
  mediaType?: MediaType;
  likedBy?: string[];
  savedBy?: string[];
  createdAt: string;
};

export type MovieListItem = {
  _id: string;
  userEmail: string;
  userName: string;
  title: string;
  description?: string;
  movies: ListMovie[];
  visibility: "public" | "private";
  likedBy?: string[];
  savedBy?: string[];
  createdAt: string;
};

export type JournalItem = {
  _id: string;
  movieTitle: string;
  posterPath?: string | null;
  watchedAt: string;
  note?: string;
  createdAt: string;
  movieId?: string;
  mediaType?: MediaType;
};

export type CommentItem = {
  _id: string;
  parentType: "review" | "list";
  parentId: string;
  userEmail: string;
  userName: string;
  body: string;
  createdAt: string;
};

export type NotificationItem = {
  _id: string;
  userEmail: string;
  type: "like" | "save" | "comment" | "follow";
  actorEmail: string;
  actorName: string;
  targetType: "review" | "list" | "user";
  targetId: string;
  targetTitle: string;
  movieId?: string;
  mediaType?: MediaType;
  read: boolean;
  createdAt: string;
};

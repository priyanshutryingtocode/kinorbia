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

// The stored shape of a film or show, shared by the three places that keep one.
// `movieId` and `title` are what everything else keys off; the rest is metadata
// TMDB returned and would otherwise need a second lookup to render.
type MediaRef = {
  movieId: string;
  title: string;
  posterPath: string | null;
  voteAverage: number;
  releaseDate?: string;
  mediaType?: MediaType;
  genreIds?: number[];
  addedAt?: string;
  // 0 when unrated. Present on a watchlist entry only when the title is also a favorite,
  // since favorite and watchlist are states on the same row.
  personalRating?: number;
};

// A favorite carries the viewer's own rating. Only something watched can be rated,
// so this is the one place `personalRating` exists.
export type FavoriteMovie = MediaRef & {
  personalRating?: number;
};

// A watchlist entry is the same reference without the rating.
//
// Not an alias of FavoriteMovie: a watchlist entry has no `personalRating`, and
// saying so is what stopped a serializer having to invent a zero for every row.
export type WatchlistMovie = MediaRef;

// A list entry is a reference with no per-row extras at all: a list is other
// people's favorites, so the viewer has no rating of their own to attach.
//
// Each omitted key is one `mediaRefFields` (models/shared.ts) does not declare, so
// Mongoose strips it on write. `personalRating` matters most: both list writers map
// through `toFavoriteMovie`, which emits it, so it would be sent and silently dropped
// on every create and update. Keep this Omit in step with `mediaRefFields`.
export type ListMovie = Omit<MediaRef, "genreIds" | "addedAt" | "personalRating">;

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

export type TmdbVideo = {
  key: string;
  name: string;
  site: string;
  type: string;
  official?: boolean;
  published_at?: string;
};

// "day" or "week": TMDB's only two trending windows. Not open-ended, because the value is
// interpolated into a request path.
export type TrendingWindow = "day" | "week";

// One service a title can be watched on. `stream` is subscription (TMDB calls it flatrate);
// rent and buy are purchases.
export type WatchProvider = {
  name: string;
  kind: "stream" | "rent" | "buy";
  logoPath: string | null;
};

type TmdbProviderEntry = {
  provider_name?: string;
  logo_path?: string | null;
};

type TmdbProviderRegion = {
  flatrate?: TmdbProviderEntry[] | null;
  rent?: TmdbProviderEntry[] | null;
  buy?: TmdbProviderEntry[] | null;
};

// The raw /watch/providers payload: a map of ISO country code to that country's offers.
export type TmdbWatchProviders = {
  id?: number;
  results?: Record<string, TmdbProviderRegion> | null;
};

export type TmdbCredits = {
  id: number;
  cast: TmdbCredit[];
  crew: TmdbCredit[];
};

export type TmdbMovieCredits = TmdbCredits;

export type TmdbTvCreator = {
  id: number;
  name: string;
  profile_path: string | null;
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
  created_by?: TmdbTvCreator[];
};

export type TmdbTvCredits = TmdbCredits;

export type ReviewItem = {
  _id: string;
  userEmail: string;
  userName: string;
  title: string;
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

// A watched title in the profile's "Recent titles" grid. `key` is the mediaKey rather than
// a document id: a watch is a state on a row, not a piece of writing, so there is no `_id`
// to link to and nothing ever did.
export type JournalItem = {
  key: string;
  title: string;
  posterPath?: string | null;
  watchedAt: string;
  movieId: string;
  mediaType: MediaType;
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

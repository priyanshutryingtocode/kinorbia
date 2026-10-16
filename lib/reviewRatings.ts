import User from "@/models/User";
import type { FavoriteMovie, WatchlistMovie } from "@/types";
import { mediaKey } from "@/lib/media";
import { usernameMapFromUsers } from "@/lib/profileLinks";
import {
  getUserMediaByKey,
  ratingMapsForUsers,
  type MediaRow,
} from "@/features/media/userMovie";
import { emailCandidates } from "@/lib/emailMatch";

export function buildRatingMap(
  favorites: Pick<FavoriteMovie, "movieId" | "mediaType" | "personalRating">[]
): Map<string, number> {
  const map = new Map<string, number>();
  for (const favorite of favorites) {
    map.set(
      mediaKey(favorite.mediaType, favorite.movieId),
      favorite.personalRating || 0
    );
  }
  return map;
}

// Re-exported from the model-free module so server callers keep one import path.
export { lookupRating } from "@/lib/feedLookups";

export async function findFavoriteByMediaKey(
  email: string,
  favoriteMediaKey: string
): Promise<FavoriteMovie | undefined> {
  const row = await getUserMediaByKey(email, favoriteMediaKey);

  return row ? toFavoriteMovie(row) : undefined;
}

// The row already carries the six fields a FavoriteMovie has, so the hand-written
// mapping that used to sit in lists/actions.ts lives here once instead.
export function toFavoriteMovie(row: MediaRow): FavoriteMovie {
  return {
    movieId: row.movieId,
    mediaType: row.mediaType,
    title: row.title,
    posterPath: row.posterPath,
    voteAverage: row.voteAverage,
    releaseDate: row.releaseDate ?? undefined,
    genreIds: row.genreIds,
    personalRating: row.personalRating,
    addedAt: row.addedAt?.toISOString(),
  };
}

// A watchlist entry is a reference without the viewer's own rating. Emitting
// `personalRating` here is what `serializeWatchlist` used to have to invent a zero for,
// and it is why `WatchlistMovie` was deliberately not an alias of `FavoriteMovie`.
// A watchlist entry carries no rating of its own, but a title can be on the watchlist AND be
// a favorite -- favorite and watchlist are states on the same usermovies row. When it is, the
// rating is real and belongs on screen; dropping it meant a watchlist item could never show
// a badge and the rating facet below it could only ever return empty.
export function toWatchlistMovie(row: MediaRow): WatchlistMovie {
  return {
    movieId: row.movieId,
    mediaType: row.mediaType,
    title: row.title,
    posterPath: row.posterPath,
    voteAverage: row.voteAverage,
    releaseDate: row.releaseDate ?? undefined,
    genreIds: row.genreIds,
    addedAt: row.addedAt?.toISOString(),
    personalRating: row.personalRating,
  };
}

// `names` is the DISPLAY name, which is not the same thing as `usernames` -- the latter is
// the handle used for the profile link. Reviews and lists carry their author's display name
// denormalized on the row, but a usermovies row carries no author name at all, so a watch
// byline has to resolve it or it falls back to printing the handle ("leo.kim").
export async function buildReviewerMaps(
  emails: (string | null | undefined)[]
): Promise<{
  ratingMaps: Map<string, Map<string, number>>;
  usernames: Map<string, string>;
  names: Map<string, string>;
}> {
  const candidates = emailCandidates(emails);
  if (candidates.length === 0) {
    return { ratingMaps: new Map(), usernames: new Map(), names: new Map() };
  }

  // `name` added to the same projection, so this stays one query rather than a second.
  const [users, ratingMaps] = await Promise.all([
    User.find({ email: { $in: candidates } })
      .select("email username name")
      .lean<{ email: string; username?: string | null; name?: string | null }[]>(),
    ratingMapsForUsers(candidates),
  ]);

  const names = new Map<string, string>();
  for (const user of users) {
    // A blank display name is worse than none: falling back to the handle is what produced
    // "leo.kim" in a byline, so only store one that is actually present.
    if (user.name) {
      names.set(user.email.toLowerCase(), user.name);
    }
  }

  return { ratingMaps, usernames: usernameMapFromUsers(users), names };
}

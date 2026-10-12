import User from "@/models/User";
import type { FavoriteMovie, MediaType, WatchlistMovie } from "@/types";
import { mediaKey } from "@/lib/media";
import { usernameMapFromUsers } from "@/lib/profileLinks";
import {
  getUserMediaByKey,
  ratingMapsForUsers,
  type MediaRow,
} from "@/features/media/userMovie";
import { emailCandidates } from "@/lib/emailMatch";

type ReviewForRating = {
  userEmail: string;
  movieId?: string;
  mediaType?: MediaType;
};

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

export function lookupRating(
  maps: Map<string, Map<string, number>>,
  review: ReviewForRating
): number {
  return maps.get(review.userEmail)?.get(mediaKey(review.mediaType, review.movieId)) || 0;
}

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
  };
}

export async function buildReviewerMaps(
  emails: (string | null | undefined)[]
): Promise<{
  ratingMaps: Map<string, Map<string, number>>;
  usernames: Map<string, string>;
}> {
  const candidates = emailCandidates(emails);
  if (candidates.length === 0) {
    return { ratingMaps: new Map(), usernames: new Map() };
  }

  const [users, ratingMaps] = await Promise.all([
    User.find({ email: { $in: candidates } })
      .select("email username")
      .lean<{ email: string; username?: string | null }[]>(),
    ratingMapsForUsers(candidates),
  ]);

  return { ratingMaps, usernames: usernameMapFromUsers(users) };
}

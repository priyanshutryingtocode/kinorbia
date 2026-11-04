import User from "@/models/User";
import type { FavoriteMovie, WatchlistMovie } from "@/types";
import { usernameMapFromUsers } from "@/lib/profileLinks";
import {
  getUserMediaByKey,
  ratingMapsForUsers,
  type MediaRow,
} from "@/features/media/userMovie";
import { emailCandidates } from "@/lib/emailMatch";

export { lookupRating } from "@/lib/feedLookups";

export async function findFavoriteByMediaKey(
  email: string,
  favoriteMediaKey: string
): Promise<FavoriteMovie | undefined> {
  const row = await getUserMediaByKey(email, favoriteMediaKey);

  return row ? toFavoriteMovie(row) : undefined;
}

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

  const [users, ratingMaps] = await Promise.all([
    User.find({ email: { $in: candidates } })
      .select("email username name")
      .lean<{ email: string; username?: string | null; name?: string | null }[]>(),
    ratingMapsForUsers(candidates),
  ]);

  const names = new Map<string, string>();
  for (const user of users) {
    if (user.name) {
      names.set(user.email.toLowerCase(), user.name);
    }
  }

  return { ratingMaps, usernames: usernameMapFromUsers(users), names };
}

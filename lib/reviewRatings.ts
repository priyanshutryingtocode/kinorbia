import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import type { FavoriteMovie, MediaType } from "@/types";
import { mediaKey, normalizeMediaType } from "@/lib/media";
import { usernameMapFromUsers } from "@/lib/profileLinks";
import { emailCandidates } from "@/lib/emailMatch";

type ReviewForRating = {
  userEmail: string;
  movieId?: string;
  mediaType?: MediaType;
};

const RATING_PROJECTION =
  "email username favorites.movieId favorites.mediaType favorites.personalRating";

type FavoriteFields = {
  email: string;
  username?: string;
  favorites?: Pick<FavoriteMovie, "movieId" | "mediaType" | "personalRating">[];
};

export function dedupeFavorites<T extends { movieId?: string; mediaType?: string }>(
  favorites: T[]
): T[] {
  const lastIndexByKey = new Map<string, number>();

  for (let index = 0; index < favorites.length; index += 1) {
    lastIndexByKey.set(mediaKey(favorites[index].mediaType, favorites[index].movieId), index);
  }

  return favorites.filter(
    (favorite, index) =>
      lastIndexByKey.get(mediaKey(favorite.mediaType, favorite.movieId)) === index
  );
}

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
  const [favMediaType, ...favIdParts] = favoriteMediaKey.split(":");
  const favId = favIdParts.join(":");

  const user = await User.findOne({ email })
    .select("favorites")
    .lean<{ favorites?: FavoriteMovie[] } | null>();

  return (user?.favorites || []).find(
    (movie) =>
      movie.movieId === favId &&
      normalizeMediaType(favMediaType) === normalizeMediaType(movie.mediaType)
  );
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

  await dbConnect();
  const users = await User.find({ email: { $in: candidates } })
    .select(RATING_PROJECTION)
    .lean<FavoriteFields[]>();

  const ratingMaps = new Map<string, Map<string, number>>();
  for (const user of users) {
    ratingMaps.set(user.email, buildRatingMap(user.favorites || []));
  }

  return { ratingMaps, usernames: usernameMapFromUsers(users) };
}

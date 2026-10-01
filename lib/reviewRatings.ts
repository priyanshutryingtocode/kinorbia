import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import type { FavoriteMovie, MediaType } from "@/types";
import { mediaKey, normalizeMediaType } from "@/lib/media";

type ReviewForRating = {
  userEmail: string;
  movieId?: string;
  mediaType?: MediaType;
};

// Generic over the two fields it reads, so a caller that has projected the rest
// of each favorite away can still pass the result here without a cast.
//
// Keeps the *newest* copy of a duplicate, matching the `$reduce` in
// `uniqueMediaItems` (lib/profileData.ts). That is the correct direction: Mongo
// preserves insertion order and `addedAt` defaults to the insertion time, so
// walking backwards and taking the first hit keeps the most recently added row.
// The rating route updates `favorites.$` positionally, so the newest copy is
// also the one holding the freshest title, poster, and personalRating.
//
// This walked forwards and kept the *oldest*, so the two dedupes disagreed about
// which copy survived -- and only rows that predate the unique index can contain
// duplicates at all, which is why the disagreement was invisible for so long.
//
// Output order matches the input order, so a caller rendering the result shows
// the array's own sequence rather than the reverse.
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

export function buildRatingMap(favorites: FavoriteMovie[]): Map<string, number> {
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

// Resolves the `mediaKey` string produced by a favorites <select> back to the
// stored favorite. Both halves are normalized so a key written with different
// casing (e.g. "Movie:123") still matches, which is why this does not simply
// compare mediaKey(movie.mediaType, movie.movieId) to the raw value.
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

export async function buildReviewerRatingMaps(
  reviews: ReviewForRating[]
): Promise<Map<string, Map<string, number>>> {
  const emails = [...new Set(reviews.map((review) => review.userEmail))];
  if (emails.length === 0) {
    return new Map();
  }

  await dbConnect();
  const users = await User.find({ email: { $in: emails } })
    .select("email favorites")
    .lean<{ email: string; favorites?: FavoriteMovie[] }[]>();

  const maps = new Map<string, Map<string, number>>();
  for (const user of users) {
    maps.set(user.email, buildRatingMap(user.favorites || []));
  }
  return maps;
}

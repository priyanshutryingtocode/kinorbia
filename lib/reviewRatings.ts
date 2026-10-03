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

// The only favorite fields `buildRatingMap` reads. See `buildReviewerMaps` for
// why the rest of each favorite is projected away.
const RATING_PROJECTION =
  "email username favorites.movieId favorites.mediaType favorites.personalRating";

type FavoriteFields = {
  email: string;
  username?: string;
  favorites?: Pick<FavoriteMovie, "movieId" | "mediaType" | "personalRating">[];
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

// Takes only the three fields it reads, so a caller that has projected the rest
// of each favorite away can pass the result without a cast -- the same reason
// `dedupeFavorites` above is generic.
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

// Everything a byline and a rating chip need from a feed's authors, in one read.
//
// `buildReviewerRatingMaps` and `buildUsernameMap` used to be called on the same
// emails on three pages -- /reviews, /activity and MovieReviewsAndLists -- each
// fetching the same User documents a second later. Against a cluster ~57ms away
// that second round-trip is a whole wave of latency for no new information, so
// the two are merged here and the rating-only helper is gone.
//
// The projection lists the three favorite fields `buildRatingMap` reads rather
// than the whole array: a title, poster path, vote average, release date and
// addedAt per favorite were being transferred for every author on the page and
// then discarded.
//
// Note the two maps key differently, and deliberately so. The rating map keys on
// the stored email because `lookupRating` compares it against the `userEmail`
// a review carries, while the username map keys lowercase because `usernameFor`
// lowercases its lookup. Both are preserved exactly as they were.
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
  // No `username: { $exists: true }` arm here, unlike `buildUsernameMap`: an
  // author with no slug still has ratings, and dropping them would change what
  // the rating chips show. The missing slug is handled when the map is built.
  const users = await User.find({ email: { $in: candidates } })
    .select(RATING_PROJECTION)
    .lean<FavoriteFields[]>();

  const ratingMaps = new Map<string, Map<string, number>>();
  for (const user of users) {
    ratingMaps.set(user.email, buildRatingMap(user.favorites || []));
  }

  return { ratingMaps, usernames: usernameMapFromUsers(users) };
}

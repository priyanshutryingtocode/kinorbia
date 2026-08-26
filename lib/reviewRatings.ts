import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import type { FavoriteMovie, MediaType } from "@/types";
import { mediaKey } from "@/lib/media";

export type ReviewForRating = {
  userEmail: string;
  movieId?: string;
  mediaType?: MediaType;
};

export function dedupeFavorites(favorites: FavoriteMovie[]): FavoriteMovie[] {
  const seen = new Set<string>();
  const deduped: FavoriteMovie[] = [];

  for (const favorite of favorites) {
    const key = mediaKey(favorite.mediaType, favorite.movieId);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(favorite);
  }

  return deduped;
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

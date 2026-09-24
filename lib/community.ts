import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import type { FavoriteMovie, MediaType } from "@/types";
import { normalizeMediaType, mediaKey } from "@/lib/media";

export type CommunityComparisonItem = {
  title: string;
  posterPath: string | null;
  mediaType: MediaType;
  movieId: string;
  yours: number;
  community: number | null;
  count: number;
  delta: number;
};

export type CommunityComparison = {
  overallCommunityAvg: number | null;
  userComparableAvg: number;
  rated: number;
  comparableCount?: number;
  sampleSize?: number;
  communityRatingCount?: number;
  items: CommunityComparisonItem[];
};

export async function buildCommunityComparison(
  favorites: FavoriteMovie[],
  userEmail?: string
): Promise<CommunityComparison | null> {
  const ratedByKey = new Map<string, FavoriteMovie>();
  for (const favorite of favorites) {
    if ((favorite.personalRating || 0) <= 0) {
      continue;
    }
    const key = mediaKey(favorite.mediaType, favorite.movieId);
    if (!ratedByKey.has(key)) {
      ratedByKey.set(key, favorite);
    }
  }
  const rated = [...ratedByKey.values()];
  if (rated.length === 0) {
    return null;
  }

  await dbConnect();

  const rows = await User.aggregate<{
    _id: { movieId: string; mediaType: string };
    avg: number;
    count: number;
  }>([
    { $unwind: "$favorites" },
    {
      $match: {
        "favorites.personalRating": { $gt: 0 },
        "favorites.movieId": { $in: rated.map((favorite) => favorite.movieId) },
        ...(userEmail ? { email: { $ne: userEmail } } : {}),
      },
    },
    {
      $group: {
        _id: {
          movieId: "$favorites.movieId",
          mediaType: { $ifNull: ["$favorites.mediaType", "movie"] },
        },
        avg: { $avg: "$favorites.personalRating" },
        count: { $sum: 1 },
      },
    },
  ]);

  const communityMap = new Map<string, { avg: number; count: number }>();
  for (const row of rows) {
    const key = mediaKey(row._id.mediaType, row._id.movieId);
    const existing = communityMap.get(key);
    if (!existing) {
      communityMap.set(key, { avg: row.avg, count: row.count });
      continue;
    }

    const count = existing.count + row.count;
    existing.avg = (existing.avg * existing.count + row.avg * row.count) / count;
    existing.count = count;
  }

  const comparableItems: CommunityComparisonItem[] = rated
    .map((favorite) => {
      const mediaType = normalizeMediaType(favorite.mediaType);
      const key = mediaKey(mediaType, favorite.movieId);
      const community = communityMap.get(key);
      return {
        title: favorite.title,
        posterPath: favorite.posterPath || null,
        mediaType,
        movieId: favorite.movieId,
        yours: (favorite.personalRating || 0) / 2,
        community: community ? community.avg / 2 : null,
        count: community?.count || 0,
        delta: community ? (favorite.personalRating || 0) / 2 - community.avg / 2 : 0,
      };
    })
    .filter((item) => item.community !== null);

  if (comparableItems.length === 0) {
    return null;
  }

  const overallCommunityAvg =
    comparableItems.reduce((sum, item) => sum + (item.community || 0), 0) / comparableItems.length;
  const userComparableAvg =
    comparableItems.reduce((sum, item) => sum + item.yours, 0) / comparableItems.length;
  const items = [...comparableItems]
    .sort((a, b) => {
      const deviationDifference = Math.abs(b.delta) - Math.abs(a.delta);
      return deviationDifference || mediaKey(a.mediaType, a.movieId).localeCompare(mediaKey(b.mediaType, b.movieId));
    })
    .slice(0, 5);
  const comparableCount = comparableItems.length;
  const communityRatingCount = comparableItems.reduce((sum, item) => sum + item.count, 0);

  return {
    overallCommunityAvg,
    userComparableAvg,
    rated: comparableCount,
    comparableCount,
    sampleSize: comparableCount,
    communityRatingCount,
    items,
  };
}

import dbConnect from "@/lib/dbConnect";
import UserMovie from "@/models/UserMovie";
import type { FavoriteMovie, MediaType } from "@/types";
import { normalizeMediaType, mediaKey } from "@/lib/media";

type CommunityComparisonItem = {
  title: string;
  posterPath: string | null;
  mediaType: MediaType;
  movieId: string;
  yours: number;
  community: number;
  count: number;
  delta: number;
};

type CommunityComparison = {
  overallCommunityAvg: number;
  userComparableAvg: number;
  comparableCount: number;
  communityRatingCount: number;
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

  const rows = await UserMovie.aggregate<{
    _id: { movieId: string; mediaType: string };
    avg: number;
    count: number;
  }>(
    [
      { $match: { "favorite.personalRating": { $gt: 0 }, ...(userEmail ? { userEmail: { $ne: userEmail } } : {}) } },
      {
        $group: {
          _id: { movieId: "$movieId", mediaType: "$mediaType" },
          avg: { $avg: "$favorite.personalRating" },
          count: { $sum: 1 },
        },
      },
    ],
    { session: null }
  );


  const communityMap = new Map<string, { avg: number; count: number }>();
  for (const row of rows) {
    communityMap.set(mediaKey(row._id.mediaType, row._id.movieId), { avg: row.avg, count: row.count });
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
    .filter((item): item is CommunityComparisonItem => item.community !== null);

  if (comparableItems.length === 0) {
    return null;
  }

  const overallCommunityAvg =
    comparableItems.reduce((sum, item) => sum + item.community, 0) / comparableItems.length;
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
    comparableCount,
    communityRatingCount,
    items,
  };
}

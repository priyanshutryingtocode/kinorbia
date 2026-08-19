import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import type { FavoriteMovie, MediaType } from "@/types";

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
  rated: number;
  items: CommunityComparisonItem[];
};

export async function buildCommunityComparison(
  favorites: FavoriteMovie[],
  userEmail?: string
): Promise<CommunityComparison | null> {
  const rated = favorites.filter((favorite) => (favorite.personalRating || 0) > 0);
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
        ...(userEmail ? { userEmail: { $ne: userEmail } } : {}),
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
    const key = `${row._id.mediaType || "movie"}:${row._id.movieId}`;
    communityMap.set(key, { avg: row.avg, count: row.count });
  }

  const items: CommunityComparisonItem[] = rated
    .map((favorite) => {
      const key = `${favorite.mediaType || "movie"}:${favorite.movieId}`;
      const community = communityMap.get(key);
      return {
        title: favorite.title,
        posterPath: favorite.posterPath || null,
        mediaType: (favorite.mediaType || "movie") as MediaType,
        movieId: favorite.movieId,
        yours: (favorite.personalRating || 0) / 2,
        community: community ? community.avg / 2 : null,
        count: community?.count || 0,
        delta: community ? (favorite.personalRating || 0) / 2 - community.avg / 2 : 0,
      };
    })
    .filter((item) => item.community !== null)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 5);

  if (items.length === 0) {
    return null;
  }

  const overallCommunityAvg =
    items.reduce((sum, item) => sum + (item.community || 0), 0) / items.length;

  return { overallCommunityAvg, rated: items.length, items };
}
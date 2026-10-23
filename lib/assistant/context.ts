import "server-only";

import { listWatchHistory, listUserMediaRows } from "@/features/media/userMovie";

export type UserContext = {
  favorites: { title: string; personalRating?: number }[];
  watched: { title: string }[];
};

export async function getUserContext(email?: string | null): Promise<UserContext> {
  if (!email) {
    return { favorites: [], watched: [] };
  }

  const [favorites, watched] = await Promise.all([
    listUserMediaRows(email, "favorite", { limit: 15 }),
    listWatchHistory(email, { limit: 20 }),
  ]);

  return {
      favorites: favorites.map((row) => ({
      title: row.title,
      personalRating: row.personalRating,
    })),
    watched: watched.map((row) => ({ title: row.title })),
  };
}
import "server-only";

import { listWatchHistory, listUserMedia } from "@/features/media/userMovie";

export type UserContext = {
  favorites: { title: string; personalRating?: number }[];
  watched: { title: string }[];
};

// The prompt quotes back only title and rating, and only the fifteen most recent. `slice(-15)` on
// the array expressed that as position; the rows carry a real date, so it is a sort now. That
// also fixed a latent bug: the array was never deduplicated.
export async function getUserContext(email?: string | null): Promise<UserContext> {
  if (!email) {
    return { favorites: [], watched: [] };
  }

  const [favorites, watched] = await Promise.all([
    listUserMedia(email, "favorite", { limit: 15 }),
    listWatchHistory(email, { limit: 20 }),
  ]);

  return {
    favorites: favorites.rows.map((row) => ({
      title: row.title,
      personalRating: row.personalRating,
    })),
    watched: watched.map((row) => ({ title: row.title })),
  };
}
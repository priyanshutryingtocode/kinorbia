import type { FavoriteMovie, MediaType } from "@/types";

export type MonthlyPoint = {
  label: string;
  count: number;
};

export type StarBucket = {
  stars: number;
  count: number;
};

export type TopRatedItem = {
  title: string;
  posterPath: string | null;
  rating: number;
  mediaType: MediaType;
  movieId: string;
  href: string;
};

export type InsightsData = {
  totalWatches: number;
  moviesWatched: number;
  showsWatched: number;
  averageRating: number;
  monthly: MonthlyPoint[];
  currentStreak: number;
  bestStreak: number;
  ratingDistribution: StarBucket[];
  topRated: TopRatedItem[];
  movieCount: number;
  showCount: number;
};

type JournalLike = {
  watchedAt: string | Date;
  rating?: number;
  mediaType?: MediaType;
  movieTitle: string;
  posterPath?: string | null;
  movieId?: string;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function localDayStr(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function computeStreaks(dayStrs: string[]) {
  let best = 0;
  let run = 0;
  let prev: number | null = null;

  for (const day of dayStrs) {
    const t = Date.parse(`${day}T00:00:00`);
    if (prev !== null && t - prev === DAY_MS) {
      run += 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
    prev = t;
  }

  let current = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastDay = dayStrs.length ? Date.parse(`${dayStrs[dayStrs.length - 1]}T00:00:00`) : null;

  if (lastDay !== null && (today.getTime() - lastDay) / DAY_MS <= 1) {
    for (let i = dayStrs.length - 1; i >= 0; i--) {
      const t = Date.parse(`${dayStrs[i]}T00:00:00`);
      if (i === dayStrs.length - 1) {
        current = 1;
      } else if (t === Date.parse(`${dayStrs[i + 1]}T00:00:00`) - DAY_MS) {
        current += 1;
      } else {
        break;
      }
    }
  }

  return { current, best };
}

function toStars(rating?: number) {
  if (!rating || rating <= 0) {
    return 0;
  }
  return Math.min(5, Math.max(1, Math.round(rating / 2)));
}

export function buildInsights(journal: JournalLike[], favorites: FavoriteMovie[]): InsightsData {
  const now = new Date();

  const monthKeys: string[] = [];
  for (let i = 11; i >= 0; i--) {
    monthKeys.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  }

  const monthCounts = new Map<string, number>();
  const dayStrs: string[] = [];
  let movieCount = 0;
  let showCount = 0;

  for (const entry of journal) {
    const date = new Date(entry.watchedAt);
    const key = monthKey(date);
    monthCounts.set(key, (monthCounts.get(key) || 0) + 1);
    dayStrs.push(localDayStr(date));

    if ((entry.mediaType || "movie") === "tv") {
      showCount += 1;
    } else {
      movieCount += 1;
    }
  }

  const monthly: MonthlyPoint[] = monthKeys.map((key) => ({
    label: new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, 1).toLocaleDateString(
      undefined,
      { month: "short" }
    ),
    count: monthCounts.get(key) || 0,
  }));

  const { current, best } = computeStreaks([...new Set(dayStrs)].sort());

  const starCounts = new Map<number, number>();
  for (const entry of journal) {
    const stars = toStars(entry.rating);
    if (stars > 0) {
      starCounts.set(stars, (starCounts.get(stars) || 0) + 1);
    }
  }
  for (const favorite of favorites) {
    const stars = toStars(favorite.personalRating);
    if (stars > 0) {
      starCounts.set(stars, (starCounts.get(stars) || 0) + 1);
    }
  }

  const ratingDistribution: StarBucket[] = [1, 2, 3, 4, 5].map((stars) => ({
    stars,
    count: starCounts.get(stars) || 0,
  }));

  const rated: TopRatedItem[] = [
    ...journal
      .filter((entry) => entry.rating && entry.rating > 0)
      .map((entry) => ({
        title: entry.movieTitle,
        posterPath: entry.posterPath || null,
        rating: entry.rating as number,
        mediaType: (entry.mediaType || "movie") as MediaType,
        movieId: entry.movieId || "",
        href:
          (entry.mediaType || "movie") === "tv"
            ? `/tv/${entry.movieId || ""}`
            : `/movie/${entry.movieId || ""}`,
      })),
    ...favorites
      .filter((favorite) => favorite.personalRating && favorite.personalRating > 0)
      .map((favorite) => ({
        title: favorite.title,
        posterPath: favorite.posterPath || null,
        rating: favorite.personalRating as number,
        mediaType: (favorite.mediaType || "movie") as MediaType,
        movieId: favorite.movieId,
        href: (favorite.mediaType || "movie") === "tv" ? `/tv/${favorite.movieId}` : `/movie/${favorite.movieId}`,
      })),
  ]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 5);

  const ratedCount = rated.length;
  const ratingSum = rated.reduce((sum, item) => sum + item.rating, 0);
  const averageRating = ratedCount ? ratingSum / ratedCount / 2 : 0;

  return {
    totalWatches: journal.length,
    moviesWatched: movieCount,
    showsWatched: showCount,
    averageRating,
    monthly,
    currentStreak: current,
    bestStreak: best,
    ratingDistribution,
    topRated: rated,
    movieCount,
    showCount,
  };
}
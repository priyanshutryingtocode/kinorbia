import type { FavoriteMovie, MediaType } from "@/types";
import { genreName } from "@/lib/genres";

export type MonthlyPoint = {
  label: string;
  count: number;
};

export type StarBucket = {
  stars: number;
  count: number;
};

export type GenreBreakdown = {
  name: string;
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
  genreBreakdown: GenreBreakdown[];
  bestMonthLabel: string | null;
  topGenre: string | null;
};

type JournalLike = {
  watchedAt: string | Date;
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

export function yearsFromJournal(journal: JournalLike[]): number[] {
  const years = new Set<number>();
  for (const entry of journal) {
    years.add(new Date(entry.watchedAt).getFullYear());
  }
  return [...years].sort((a, b) => b - a);
}

function monthKeysFor(now: Date, year?: number): { key: string; label: string }[] {
  const keys: { key: string; label: string }[] = [];

  if (year) {
    for (let month = 0; month < 12; month += 1) {
      keys.push({
        key: `${year}-${pad(month + 1)}`,
        label: new Date(year, month, 1).toLocaleDateString(undefined, { month: "short" }),
      });
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push({
        key: monthKey(date),
        label: date.toLocaleDateString(undefined, { month: "short" }),
      });
    }
  }

  return keys;
}

export function buildInsights(
  journal: JournalLike[],
  favorites: FavoriteMovie[],
  year?: number
): InsightsData {
  const now = new Date();

  const filteredJournal = year
    ? journal.filter((entry) => new Date(entry.watchedAt).getFullYear() === year)
    : journal;

  const filteredFavorites = year
    ? favorites.filter((favorite) => {
        const addedAt = favorite.addedAt ? new Date(favorite.addedAt).getTime() : NaN;
        return !Number.isNaN(addedAt) && new Date(addedAt).getFullYear() === year;
      })
    : favorites;

  const monthKeys = monthKeysFor(now, year);

  const monthCounts = new Map<string, number>();
  const dayStrs: string[] = [];
  let movieCount = 0;
  let showCount = 0;

  for (const entry of filteredJournal) {
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

  const monthly: MonthlyPoint[] = monthKeys.map(({ key, label }) => ({
    label,
    count: monthCounts.get(key) || 0,
  }));

  let bestMonthLabel: string | null = null;
  let bestMonthCount = 0;
  for (const point of monthly) {
    if (point.count > bestMonthCount) {
      bestMonthCount = point.count;
      bestMonthLabel = point.label;
    }
  }

  const { current, best } = computeStreaks([...new Set(dayStrs)].sort());

  const starCounts = new Map<number, number>();
  for (const favorite of filteredFavorites) {
    const stars = toStars(favorite.personalRating);
    if (stars > 0) {
      starCounts.set(stars, (starCounts.get(stars) || 0) + 1);
    }
  }

  const ratingDistribution: StarBucket[] = [1, 2, 3, 4, 5].map((stars) => ({
    stars,
    count: starCounts.get(stars) || 0,
  }));

  const ratedFavorites = filteredFavorites.filter(
    (favorite) => favorite.personalRating && favorite.personalRating > 0
  );

  const ratedCount = ratedFavorites.length;
  const ratingSum = ratedFavorites.reduce((sum, favorite) => sum + (favorite.personalRating || 0), 0);
  const averageRating = ratedCount ? ratingSum / ratedCount / 2 : 0;

  const topRated: TopRatedItem[] = ratedFavorites
    .map((favorite) => ({
      title: favorite.title,
      posterPath: favorite.posterPath || null,
      rating: favorite.personalRating as number,
      mediaType: (favorite.mediaType || "movie") as MediaType,
      movieId: favorite.movieId,
      href: (favorite.mediaType || "movie") === "tv" ? `/tv/${favorite.movieId}` : `/movie/${favorite.movieId}`,
    }))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 5);

  const genreCounts = new Map<string, number>();
  for (const favorite of filteredFavorites) {
    const mediaType = favorite.mediaType || "movie";
    for (const genreId of favorite.genreIds || []) {
      const name = genreName(genreId, mediaType);
      if (name) {
        genreCounts.set(name, (genreCounts.get(name) || 0) + 1);
      }
    }
  }

  const genreBreakdown: GenreBreakdown[] = [...genreCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 8);

  return {
    totalWatches: filteredJournal.length,
    moviesWatched: movieCount,
    showsWatched: showCount,
    averageRating,
    monthly,
    currentStreak: current,
    bestStreak: best,
    ratingDistribution,
    topRated,
    movieCount,
    showCount,
    genreBreakdown,
    bestMonthLabel,
    topGenre: genreBreakdown[0]?.name || null,
  };
}
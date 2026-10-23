
import { mediaKey } from "@/lib/media";
import type { MovieSummary, MediaType } from "@/types";

export type TasteSignal = {
  genreWeights: Record<number, number>;
  averageRating: number | null;
  sampleSize: number;
  preferredType: MediaType;
  typeLean: number;
};

export const MIN_TASTE_SAMPLE = 8;

type WatchedSignal = {
  genreIds?: number[];
  mediaType?: MediaType;
  personalRating?: number;
};

function clamp01(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function buildTasteProfile(watched: WatchedSignal[]): TasteSignal {
  const counts = new Map<number, number>();
  const ratingTotals = new Map<number, { sum: number; n: number }>();
  const typeCounts = { movie: 0, tv: 0 };

  let ratingSum = 0;
  let ratingCount = 0;

  for (const item of watched) {
    const type = item.mediaType ?? "movie";
    typeCounts[type] += 1;

    for (const genre of item.genreIds ?? []) {
      counts.set(genre, (counts.get(genre) ?? 0) + 1);
    }

    const rating = item.personalRating ?? 0;
    if (rating > 0) {
      ratingSum += rating;
      ratingCount += 1;
      for (const genre of item.genreIds ?? []) {
        const entry = ratingTotals.get(genre) ?? { sum: 0, n: 0 };
        entry.sum += rating;
        entry.n += 1;
        ratingTotals.set(genre, entry);
      }
    }
  }

  const maxCount = Math.max(0, ...counts.values());
  const averageRating = ratingCount > 0 ? ratingSum / ratingCount : null;

  const genreWeights: Record<number, number> = {};
  for (const [genre, count] of counts) {
    const share = maxCount > 0 ? count / maxCount : 0;
    const genreMean = ratingTotals.get(genre);
    const quality =
      genreMean && genreMean.n > 0 ? clamp01((genreMean.sum / genreMean.n - 5) / 5 + 1) : 1;
    genreWeights[genre] = clamp01(share * quality);
  }

  const totalType = typeCounts.movie + typeCounts.tv;
  const preferredType: MediaType = typeCounts.tv > typeCounts.movie ? "tv" : "movie";
  const typeLean = totalType > 0 ? Math.abs(typeCounts.movie - typeCounts.tv) / totalType : 0;

  return {
    genreWeights,
    averageRating,
    sampleSize: watched.length,
    preferredType,
    typeLean,
  };
}

export type ScoredCandidate = MovieSummary & {
  score: number;
  why: string;
};

type ScoreOptions = {
  owned: Set<string>;
  limit?: number;
  genreDivisor?: number;
};

export function scoreCandidates(
  profile: TasteSignal,
  candidates: MovieSummary[],
  options: ScoreOptions
): ScoredCandidate[] {
  const limit = options.limit ?? 12;
  const divisor = Math.max(1, options.genreDivisor ?? 6);

  if (profile.sampleSize < MIN_TASTE_SAMPLE) return [];

  const scored: ScoredCandidate[] = [];

  for (const candidate of candidates) {
    const type = candidate.mediaType ?? "movie";
    const key = mediaKey(type, candidate.id);
    if (options.owned.has(key)) continue;

    const genres = candidate.genre_ids ?? [];
    if (genres.length === 0) continue;

    const matches = genres.filter((genre) => (profile.genreWeights[genre] ?? 0) > 0);
    if (matches.length === 0) continue;

    const affinity =
      matches.reduce((total, genre) => total + (profile.genreWeights[genre] ?? 0), 0) / divisor;

    const acclaim = clamp01((candidate.vote_average ?? 0) / 10);

    const typeScore = type === profile.preferredType ? profile.typeLean * 0.3 : -0.1;

    const score = affinity * 0.6 + acclaim * 0.25 + typeScore;

    scored.push({
      ...candidate,
      mediaType: type,
      score,
      why: matches.slice(0, 3).join(", "),
    });
  }

  return scored
    .sort((a, b) => b.score - a.score || String(a.id).localeCompare(String(b.id)))
    .slice(0, limit);
}
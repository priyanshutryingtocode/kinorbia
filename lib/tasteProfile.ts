// Taste-based recommendations.
//
// Everything else the app calls "recommendations" is title-to-title: given a movie, TMDB's
// /recommendations returns similar films. This is the other half -- given a MEMBER, what
// should they watch next -- which is the thing Letterboxd is known for and the one thing
// this app was not doing, despite already storing everything it needs.
//
// The input is the library. A member's watched genres say what they like; the ratings they
// gave say how much they liked it. Both are already in usermovies, and Insights computes a
// genre breakdown from them that nothing was consuming.
//
// Pure functions, no database and no network: the taste profile and the scoring are separate
// so the interesting part -- the scoring -- can be reasoned about and tested on its own.

import { mediaKey } from "@/lib/media";
import type { MovieSummary, MediaType } from "@/types";

export type TasteSignal = {
  /** Genre id -> a 0..1 weight, from what they watched. */
  genreWeights: Record<number, number>;
  /** Weighted mean of the ratings they gave, or null when they rated nothing. */
  averageRating: number | null;
  /** How many titles produced the profile. Below the threshold it is not a taste yet. */
  sampleSize: number;
  /** Media type they lean toward, and by how much. */
  preferredType: MediaType;
  typeLean: number;
};

// Below this, a profile is noise: one film watched does not mean a member likes action,
// and recommending a whole shelf of it off one title is worse than recommending nothing.
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

/**
 * Build the taste profile from what a member watched and rated.
 *
 * Genres are weighted by how many watched titles carry them, normalised so the most-watched
 * genre is 1. Ratings tilt the profile: a genre watched often but rated poorly is down-
 * weighted, and a genre rated highly is up-weighted. Without that term the profile is just
 * a watch count and would recommend a member three films in a genre they clearly disliked.
 */
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
    // Averaged over 1..10 and centred on 5, so a genre rated 8/10 contributes ~1.3 and one
    // rated 3/10 contributes ~0.4. Multiplied, not added: an unwatched genre stays 0.
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

// Internal to the scorer below; not exported because nothing outside lib/ names these.
type ScoreOptions = {
  /** Keys the member already has, as `${mediaType}:${id}`. Never recommended back. */
  owned: Set<string>;
  limit?: number;
  // A title can match on several genres; without a divisor a broad title would beat a
  // focused one purely by being tagged more.
  genreDivisor?: number;
};

/**
 * Score candidates against a taste profile.
 *
 * Three terms, deliberately simple and explainable -- a recommender nobody can reason about
 * is not worth having in a project someone has to defend:
 *
 *   1. genre affinity   how much of this title's genre weight the profile already carries
 *   2. critical acclaim vote_average, softly -- TMDB scores are noisy, not signal
 *   3. type affinity     the member's movie/show lean
 *
 * `why` is returned alongside so the UI can say why, which is both the honest thing to show
 * and what makes the output checkable by hand.
 */
export function scoreCandidates(
  profile: TasteSignal,
  candidates: MovieSummary[],
  options: ScoreOptions
): ScoredCandidate[] {
  const limit = options.limit ?? 12;
  const divisor = Math.max(1, options.genreDivisor ?? 6);

  // Below this the profile is not a taste yet, and guessing is worse than saying nothing.
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

    // vote_average is 0..10; scaled to 0..1 and deliberately underweighted. TMDB's crowd
    // score is a weak signal, and letting it dominate would return blockbusters.
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

  // Ties broken by id so the same inputs always produce the same order -- otherwise a
  // member's row would reshuffle between renders with nothing changed.
  return scored
    .sort((a, b) => b.score - a.score || String(a.id).localeCompare(String(b.id)))
    .slice(0, limit);
}
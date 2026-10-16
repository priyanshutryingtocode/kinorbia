import "server-only";

import { mediaKey } from "@/lib/media";
import dbConnect from "@/lib/dbConnect";
import UserMovie from "@/models/UserMovie";
import { discoverMovies, discoverTv } from "@/lib/tmdb";
import {
  buildTasteProfile,
  scoreCandidates,
  MIN_TASTE_SAMPLE,
  type ScoredCandidate,
  type TasteSignal,
} from "@/lib/tasteProfile";
import type { MediaType, MovieSummary } from "@/types";

// The database half of taste-based recommendations.
//
// buildTasteProfile and scoreCandidates are pure and tested on their own; this only gathers
// the two inputs and hands them over. Keeping the split here is the point: the interesting
// part of a recommender is the scoring, and it should be possible to check by hand.

type RecommendationResult = {
  /** Empty when the member has too little history, or the candidate pool came back empty. */
  recommendations: ScoredCandidate[];
  profile: TasteProfileSummary;
};

type TasteProfileSummary = {
  sampleSize: number;
  topGenres: { id: number; weight: number }[];
  averageRating: number | null;
  preferredType: MediaType;
  /** False when there is not enough history yet, which is a different empty state. */
  ready: boolean;
};

// Enough candidates for a rank to mean something after owned titles are filtered out.
const CANDIDATE_PAGES = 2;

// How many pages of the member's history to read for the profile. Bounded because this is a
// profile page render: a member with thousands of titles should not make it wait on 5000.
const HISTORY_LIMIT = 400;

function summarise(profile: TasteSignal): TasteProfileSummary {
  return {
    sampleSize: profile.sampleSize,
    topGenres: Object.entries(profile.genreWeights)
      .map(([id, weight]) => ({ id: Number(id), weight }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5),
    averageRating: profile.averageRating,
    preferredType: profile.preferredType,
    ready: profile.sampleSize >= MIN_TASTE_SAMPLE,
  };
}

export async function getTasteRecommendations(
  email: string,
  limit = 12
): Promise<RecommendationResult> {
  await dbConnect();

  const history = await UserMovie.find({
    userEmail: email,
    "watched.watchedAt": { $ne: null },
  })
    .select("movieId mediaType genreIds favorite.personalRating watched.watchedAt")
    .sort({ "watched.watchedAt": -1 })
    .limit(HISTORY_LIMIT)
    .lean<
      {
        movieId: string;
        mediaType?: MediaType;
        genreIds?: number[];
        favorite?: { personalRating?: number };
      }[]
    >();

  const profile = buildTasteProfile(
    history.map((row) => ({
      genreIds: row.genreIds ?? [],
      mediaType: row.mediaType ?? "movie",
      personalRating: row.favorite?.personalRating ?? 0,
    }))
  );

  if (profile.sampleSize < MIN_TASTE_SAMPLE) {
    return { recommendations: [], profile: summarise(profile) };
  }

  // Candidates come from TMDB discovery, ordered by popularity so the pool is mainstream
  // rather than obscure. Niche titles are reachable through search; this is the "what should
  // I watch tonight" surface, and the answer to that is never a title with no vote_average.
  const candidates: MovieSummary[] = [];
  for (const type of ["movie", "tv"] as MediaType[]) {
    for (let page = 1; page <= CANDIDATE_PAGES; page += 1) {
      // `.results`, not the list itself: TMDB fetchers return FilteredList, which drops
      // posterless and undated titles on the way through -- the same display filter every
      // other grid relies on, so a recommendation can never be one that renders blank.
      const found = type === "movie" ? await discoverMovies("", page) : await discoverTv("", page);
      for (const item of found?.results ?? []) {
        candidates.push({ ...item, mediaType: type });
      }
    }
  }

  const owned = new Set(history.map((row) => mediaKey(row.mediaType, row.movieId)));

  return {
    recommendations: scoreCandidates(profile, candidates, { owned, limit }),
    profile: summarise(profile),
  };
}
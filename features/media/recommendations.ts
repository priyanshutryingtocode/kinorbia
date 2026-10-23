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


type RecommendationResult = {
  recommendations: ScoredCandidate[];
  profile: TasteProfileSummary;
};

type TasteProfileSummary = {
  sampleSize: number;
  topGenres: { id: number; weight: number }[];
  averageRating: number | null;
  preferredType: MediaType;
  ready: boolean;
};

const CANDIDATE_PAGES = 2;

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

  const candidates: MovieSummary[] = [];
  for (const type of ["movie", "tv"] as MediaType[]) {
    for (let page = 1; page <= CANDIDATE_PAGES; page += 1) {
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
import "server-only";

import dbConnect from "@/lib/dbConnect";
import { MAX_FAVORITES } from "@/lib/bounds";
import { addFavorite } from "@/features/media/userMovie";
import { emailMatch } from "@/lib/emailMatch";
import UserMovie from "@/models/UserMovie";
import type { ClientSession } from "mongoose";
import type { MediaType } from "@/types";

type MutationOptions = { session?: ClientSession };

type RateResult =
  | { ok: true; rating: number }
  | { ok: false; reason: "not-watched" | "list-full" };

export async function rateFavorite({
  email,
  movieId,
  mediaType,
  movieTitle,
  posterPath,
  voteAverage,
  releaseDate,
  genreIds,
  rating,
}: {
  email: string;
  movieId: string;
  mediaType: MediaType;
  movieTitle: string;
  posterPath?: string | null;
  voteAverage?: number | null;
  releaseDate?: string | null;
  genreIds?: number[];
  rating: number;
}, { session }: MutationOptions = {}): Promise<RateResult> {
  await dbConnect();

  const watched = await UserMovie.countDocuments(
    { userEmail: email, movieId, mediaType, "watched.watchedAt": { $ne: null } },
    session ? { session } : {}
  );

  if (watched === 0) {
    return { ok: false, reason: "not-watched" };
  }

  const { refused } = await rateFavoriteTx(
    { email, movieId, mediaType, movieTitle, posterPath, voteAverage, releaseDate, genreIds, rating },
    session
  );

  if (refused) {
    return { ok: false, reason: "list-full" };
  }

  return { ok: true, rating };
}

async function rateFavoriteTx(
  input: {
    email: string;
    movieId: string;
    mediaType: MediaType;
    movieTitle: string;
    posterPath?: string | null;
    voteAverage?: number | null;
    releaseDate?: string | null;
    genreIds?: number[];
    rating: number;
  },
  session?: ClientSession
): Promise<{ count: number; alreadyFavorited: boolean; refused?: boolean }> {
  const count = await UserMovie.countDocuments(
    { userEmail: emailMatch(input.email), "favorite.addedAt": { $ne: null } },
    session ? { session } : {}
  );

  const existing = await UserMovie.findOne({
    userEmail: emailMatch(input.email),
    movieId: input.movieId,
    mediaType: input.mediaType,
  })
    .select("favorite")
    .session(session ?? null)
    .lean<{ favorite?: { addedAt?: Date } } | null>();

  const alreadyFavorited = Boolean(existing?.favorite?.addedAt);
  if (!alreadyFavorited && count >= MAX_FAVORITES) {
    return { count, alreadyFavorited, refused: true };
  }

  await addFavorite(
    input.email.trim().toLowerCase(),
    {
      movieId: input.movieId,
      mediaType: input.mediaType,
      title: input.movieTitle,
      posterPath: input.posterPath,
      voteAverage: input.voteAverage,
      releaseDate: input.releaseDate,
      genreIds: input.genreIds,
      personalRating: input.rating,
    },
    session ? { session } : {}
  );

  return { count, alreadyFavorited };
}
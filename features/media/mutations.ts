import "server-only";

import dbConnect from "@/lib/dbConnect";
import { MAX_FAVORITES } from "@/lib/bounds";
import { addFavorite } from "@/features/media/userMovie";
import { emailMatch } from "@/lib/emailMatch";
import UserMovie from "@/models/UserMovie";
import type { ClientSession } from "mongoose";
import type { MediaType } from "@/types";

// `session` is not test-only scaffolding: the 2500-entry caps have to count and insert inside
// one transaction to stay atomic. Accepting a session keeps every mutation composable.
type MutationOptions = { session?: ClientSession };

type RateResult =
  | { ok: true; rating: number }
  | { ok: false; reason: "not-watched" | "list-full" };

// Rates a title a member has already watched: the gate reads `watched.watchedAt`, and the
// rating lands on that same row, so the two cannot disagree about whether it was watched.
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

    // Model.exists() takes no options, so a session-aware check has to be a countDocuments.
  const watched = await UserMovie.countDocuments(
    { userEmail: email, movieId, mediaType, "watched.watchedAt": { $ne: null } },
    session ? { session } : {}
  );

  if (watched === 0) {
    return { ok: false, reason: "not-watched" };
  }

  // The cap only binds a title the member does not already have, and rateFavoriteTx refuses
  // before writing, so `refused` means nothing was created.
  const { refused } = await rateFavoriteTx(
    { email, movieId, mediaType, movieTitle, posterPath, voteAverage, releaseDate, genreIds, rating },
    session
  );

  if (refused) {
    return { ok: false, reason: "list-full" };
  }

  return { ok: true, rating };
}

// A counted upsert: the cap test and the write are one operation, so two concurrent ratings
// cannot both see room.
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
  // Sequential, not Promise.all: a ClientSession is single-threaded and the caller
  // supplies one inside a transaction, so two queries at once would contend for it and
  // the second result would not be trustworthy.
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

  // Refuse BEFORE writing. The old array version refused the `$push` in the filter and so
  // never created anything; deciding after the upsert would leave behind a row for a title
  // the member was told was rejected.
  if (!alreadyFavorited && count >= MAX_FAVORITES) {
    return { count, alreadyFavorited, refused: true };
  }

  // The write key is the normalized string, not emailMatch()'s {$in} filter.
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
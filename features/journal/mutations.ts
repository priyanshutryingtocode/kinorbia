import "server-only";

import dbConnect from "@/lib/dbConnect";
import { isDuplicateKeyError } from "@/lib/dbConnect";
import { markWatched as upsertWatched } from "@/features/media/userMovie";
import type mongoose from "mongoose";
import type { MediaType } from "@/types";

type MutationOptions = { session?: mongoose.ClientSession };

type MarkWatchedInput = {
  userEmail: string;
  movieId: string;
  movieTitle: string;
  posterPath: string | null;
  mediaType: MediaType;
};

// The write the profile grid, the streaks, the insights and the rating gate all read.
//
// This used to write a journal entry and mirror it onto a usermovies row: two collections to
// keep in step, three reads per question. One row now, and idempotent: `watched.watchedAt` is
// first-write-wins through `$min`, so re-marking never moves when it was watched.
export async function markWatched(
  input: MarkWatchedInput,
  { session }: MutationOptions = {}
) {
  await dbConnect();

  const write = {
    movieId: input.movieId,
    mediaType: input.mediaType,
    // `movieTitle` is the wire field name; the stored field is `title`.
    title: input.movieTitle,
    posterPath: input.posterPath,
  };

  const run = () => upsertWatched(input.userEmail, write, { session });

  try {
    return await run();
  } catch (error) {
    // Two concurrent marks can both miss and both upsert, and the unique index rejects the
    // loser. That is the expected outcome, not a failure: the row exists either way, so the
    // same statement is retried and now matches.
    if (!isDuplicateKeyError(error)) {
      throw error;
    }
    return run();
  }
}
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

export async function markWatched(
  input: MarkWatchedInput,
  { session }: MutationOptions = {}
) {
  await dbConnect();

  const write = {
    movieId: input.movieId,
    mediaType: input.mediaType,
    title: input.movieTitle,
    posterPath: input.posterPath,
  };

  const run = () => upsertWatched(input.userEmail, write, { session });

  try {
    return await run();
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }
    return run();
  }
}
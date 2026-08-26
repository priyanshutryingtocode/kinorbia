import { NextResponse } from "next/server";
import JournalEntry from "@/models/JournalEntry";
import { withAuthedUser } from "@/lib/session";
import { parseBody, badRequest } from "@/lib/validators";
import { z } from "zod";
import { isDuplicateKeyError } from "@/lib/dbConnect";
import { mediaEquals } from "@/lib/media";

const markWatchedSchema = z.object({
  movieId: z.union([z.string(), z.number()]).transform(String),
  movieTitle: z.string().trim().min(1).max(120),
  posterPath: z.string().trim().max(500).nullish().transform((v) => v ?? null),
  mediaType: z.enum(["movie", "tv"]).optional().default("movie"),
});

export const POST = withAuthedUser(
  async (req, { email, name }) => {
    const body = await parseBody(req, markWatchedSchema);
    if (!body) {
      return badRequest("Movie details are required.");
    }

    const markWatched = () =>
      JournalEntry.updateOne(
        {
          userEmail: email,
          movieId: body.movieId,
          mediaType: mediaEquals(body.mediaType),
        },
        {
          $setOnInsert: {
            userEmail: email,
            userName: name || "KinOrbia user",
            movieId: body.movieId,
            mediaType: body.mediaType,
            movieTitle: body.movieTitle,
            posterPath: body.posterPath,
            watchedAt: new Date(),
          },
        },
        { upsert: true }
      );

    try {
      await markWatched();
    } catch (error) {
      // Concurrent upserts race past the missing-document check under the
      // unique index; retrying updates the winner's document instead.
      if (!isDuplicateKeyError(error)) {
        throw error;
      }
      await markWatched();
    }

    return NextResponse.json({ isWatched: true, message: "Marked as watched" });
  },
  { windowMs: 60 * 1000, limit: 60, errorLabel: "marking movie as watched" }
);

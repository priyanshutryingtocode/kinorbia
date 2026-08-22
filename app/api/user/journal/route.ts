import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import JournalEntry from "@/models/JournalEntry";
import { getSessionUser } from "@/lib/session";
import { parseBody, badRequest } from "@/lib/validators";
import { z } from "zod";
import { withRateLimit } from "@/lib/rateLimit";
import { mediaEquals } from "@/lib/media";

const markWatchedSchema = z.object({
  movieId: z.union([z.string(), z.number()]).transform(String),
  movieTitle: z.string().trim().min(1).max(120),
  posterPath: z.string().trim().max(500).nullish().transform((v) => v ?? null),
  mediaType: z.enum(["movie", "tv"]).optional().default("movie"),
});

function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}

export const POST = withRateLimit(
  async (req: Request) => {
    try {
      const { email, name } = await getSessionUser();
      if (!email) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }

      const body = await parseBody(req, markWatchedSchema);
      if (!body) {
        return badRequest("Movie details are required.");
      }

      await dbConnect();

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
    } catch (error) {
      console.error("Error marking movie as watched:", error);
      return NextResponse.json({ message: "Error marking movie as watched" }, { status: 500 });
    }
  },
  { windowMs: 60 * 1000, limit: 60 }
);
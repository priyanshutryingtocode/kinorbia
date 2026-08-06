import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import JournalEntry from "@/models/JournalEntry";
import { getSessionUser } from "@/lib/session";
import { parseBody, badRequest } from "@/lib/validators";
import { z } from "zod";
import { withRateLimit } from "@/lib/rateLimit";

const markWatchedSchema = z.object({
  movieId: z.union([z.string(), z.number()]).transform(String),
  movieTitle: z.string().trim().min(1).max(120),
  posterPath: z.string().trim().max(500).nullish().transform((v) => v ?? null),
});

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

      await JournalEntry.updateOne(
        {
          userEmail: email,
          movieId: body.movieId,
        },
        {
          $setOnInsert: {
            userEmail: email,
            userName: name || "KinOrbia user",
            movieId: body.movieId,
            movieTitle: body.movieTitle,
            posterPath: body.posterPath,
            watchedAt: new Date(),
          },
        },
        { upsert: true }
      );

      return NextResponse.json({ isWatched: true, message: "Marked as watched" });
    } catch (error) {
      console.error("Error marking movie as watched:", error);
      return NextResponse.json({ message: "Error marking movie as watched" }, { status: 500 });
    }
  },
  { windowMs: 60 * 1000, limit: 60 }
);
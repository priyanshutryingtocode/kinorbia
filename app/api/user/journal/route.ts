import { NextResponse } from "next/server";
import { withAuthedUser } from "@/lib/session";
import { parseBody, badRequest } from "@/lib/validators";
import { z } from "zod";
import { markWatched } from "@/features/journal/mutations";

const markWatchedSchema = z.object({
  movieId: z.union([z.string(), z.number()]).transform(String).pipe(z.string().max(64)),
  movieTitle: z.string().trim().min(1).max(120),
  posterPath: z.string().trim().max(500).nullish().transform((v) => v ?? null),
  mediaType: z.enum(["movie", "tv"]).optional().default("movie"),
});

export const POST = withAuthedUser(
  async (req, { email }) => {
    const body = await parseBody(req, markWatchedSchema);
    if (!body) {
      return badRequest("Movie details are required.");
    }

    await markWatched({
      userEmail: email,
      movieId: body.movieId,
      movieTitle: body.movieTitle,
      posterPath: body.posterPath,
      mediaType: body.mediaType,
    });

    return NextResponse.json({ isWatched: true, message: "Marked as watched" });
  },
  { windowMs: 60 * 1000, limit: 60, errorLabel: "marking movie as watched" }
);

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { getSessionEmail } from "@/lib/session";
import { movieRefSchema, parseBody, badRequest } from "@/lib/validators";
import { withRateLimit } from "@/lib/rateLimit";
import { hasCapacity, MAX_WATCHLIST } from "@/lib/bounds";

export const POST = withRateLimit(
  async (req: Request) => {
    const email = await getSessionEmail();
    if (!email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await parseBody(req, movieRefSchema);
    if (!body) {
      return badRequest("A valid movie is required.");
    }

    await dbConnect();
    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    const exists = user.watchlist?.some(
      (movie: { movieId: string; mediaType?: string }) =>
        movie.movieId === body.movieId && (movie.mediaType || "movie") === body.mediaType
    );

    if (exists) {
      user.watchlist = user.watchlist.filter(
        (movie: { movieId: string; mediaType?: string }) =>
          !(movie.movieId === body.movieId && (movie.mediaType || "movie") === body.mediaType)
      );
    } else {
      if (!hasCapacity(user.watchlist, MAX_WATCHLIST)) {
        return NextResponse.json({ message: "Watchlist is full." }, { status: 409 });
      }

      user.watchlist.push({
        movieId: body.movieId,
        title: body.movieTitle,
        posterPath: body.posterPath,
        voteAverage: body.voteAverage,
        releaseDate: body.releaseDate,
        mediaType: body.mediaType,
        addedAt: new Date(),
      });
    }

    await user.save();
    return NextResponse.json({ isWatchlisted: !exists });
  },
  { windowMs: 60 * 1000, limit: 60 }
);
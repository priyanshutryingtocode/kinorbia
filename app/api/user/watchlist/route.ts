import { NextResponse } from "next/server";
import { withAuthedUser } from "@/lib/session";
import { movieRefSchema, parseMovieBody, badRequest } from "@/lib/validators";
import { toggleMedia } from "@/features/media/userMovie";

export const POST = withAuthedUser(
  async (req, { email }) => {
    const body = await parseMovieBody(req, movieRefSchema);
    if (!body) {
      return badRequest("A valid movie is required.");
    }

    const result = await toggleMedia({
      email,
      state: "watchlist",
      snapshot: {
        movieId: body.movieId,
        mediaType: body.mediaType,
        // genreIds was dropped by Mongoose's strict mode while the sub-schema lacked the
        // field. The schema declares it now, so a watchlist entry carries the same genres a
        // favorite does -- as data seeded via the raw driver always has.
        title: body.movieTitle,
        posterPath: body.posterPath,
        voteAverage: body.voteAverage,
        releaseDate: body.releaseDate,
        genreIds: body.genreIds,
      },
    });

    if (result === "added") {
      return NextResponse.json({ isWatchlisted: true });
    }

    if (result === "removed") {
      return NextResponse.json({ isWatchlisted: false });
    }

    if (result === "missing") {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    return NextResponse.json({ message: "Watchlist is full." }, { status: 409 });
  },
  { windowMs: 60 * 1000, limit: 60, errorLabel: "updating watchlist" }
);

import { NextResponse } from "next/server";
import { withAuthedUser } from "@/lib/session";
import { movieRefSchema, parseMovieBody, badRequest } from "@/lib/validators";
import { MAX_WATCHLIST } from "@/lib/bounds";
import { toggleEmbeddedMedia } from "@/lib/mediaListToggle";

export const POST = withAuthedUser(
  async (req, { email }) => {
    const body = await parseMovieBody(req, movieRefSchema);
    if (!body) {
      return badRequest("A valid movie is required.");
    }

    const result = await toggleEmbeddedMedia({
      email,
      field: "watchlist",
      max: MAX_WATCHLIST,
      movieId: body.movieId,
      mediaType: body.mediaType,
      // No genreIds here, unlike favorites: the watchlist entry schema has no
      // such field, so pushing one would be ignored anyway.
      entry: {
        title: body.movieTitle,
        posterPath: body.posterPath,
        voteAverage: body.voteAverage,
        releaseDate: body.releaseDate,
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

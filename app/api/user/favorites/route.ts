import { NextResponse } from "next/server";
import { withAuthedUser } from "@/lib/session";
import { movieRefSchema, parseMovieBody, badRequest } from "@/lib/validators";
import { MAX_FAVORITES } from "@/lib/bounds";
import { toggleEmbeddedMedia } from "@/lib/mediaListToggle";

export const POST = withAuthedUser(
  async (req, { email }) => {
    const body = await parseMovieBody(req, movieRefSchema);
    if (!body) {
      return badRequest("A valid movie is required.");
    }

    const result = await toggleEmbeddedMedia({
      email,
      field: "favorites",
      max: MAX_FAVORITES,
      movieId: body.movieId,
      mediaType: body.mediaType,
      entry: {
        title: body.movieTitle,
        posterPath: body.posterPath,
        voteAverage: body.voteAverage,
        releaseDate: body.releaseDate,
        genreIds: body.genreIds || [],
      },
    });

    if (result === "added") {
      return NextResponse.json({ isFavorite: true, message: "Added to favorites" });
    }

    if (result === "removed") {
      return NextResponse.json({ isFavorite: false, message: "Removed from favorites" });
    }

    if (result === "missing") {
      console.error("Session user was not found in the database.");
      return NextResponse.json({ message: "User record not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Favorites list is full." }, { status: 409 });
  },
  { windowMs: 60 * 1000, limit: 20, errorLabel: "updating favorites" }
);

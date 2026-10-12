import { NextResponse } from "next/server";
import { withAuthedUser } from "@/lib/session";
import { rateMovieSchema, parseMovieBody, badRequest } from "@/lib/validators";
import { rateFavorite } from "@/features/media/mutations";

export const POST = withAuthedUser(
  async (req, { email }) => {
    const body = await parseMovieBody(req, rateMovieSchema);
    if (!body) {
      return badRequest("Movie and rating are required.");
    }

    const result = await rateFavorite({
      email,
      movieId: body.movieId,
      mediaType: body.mediaType,
      movieTitle: body.movieTitle,
      posterPath: body.posterPath,
      voteAverage: body.voteAverage,
      releaseDate: body.releaseDate,
      genreIds: body.genreIds,
      rating: body.rating,
    });

    if (result.ok) {
      return NextResponse.json({ rating: result.rating });
    }

    switch (result.reason) {
      case "not-watched":
        return NextResponse.json(
          { message: "Mark this as watched before rating it." },
          { status: 409 }
        );
      case "list-full":
        return NextResponse.json({ message: "Favorites list is full." }, { status: 409 });
    }
  },
  { windowMs: 60 * 1000, limit: 120, errorLabel: "updating movie rating" }
);
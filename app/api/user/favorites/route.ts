import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { getSessionEmail } from "@/lib/session";
import { movieRefSchema, parseMovieBody, badRequest } from "@/lib/validators";
import { withRateLimit } from "@/lib/rateLimit";
import { hasCapacity, MAX_FAVORITES } from "@/lib/bounds";
import { mediaEquals } from "@/lib/media";
import type { FavoriteMovie } from "@/types";

export const POST = withRateLimit(
  async (req: Request) => {
    try {
      const email = await getSessionEmail();
      if (!email) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }

      const body = await parseMovieBody(req, movieRefSchema);
      if (!body) {
        return badRequest("A valid movie is required.");
      }

      await dbConnect();

      const user = await User.findOne({ email });

      if (!user) {
        console.error("Session user was not found in the database.");
        return NextResponse.json({ message: "User record not found" }, { status: 404 });
      }

      const normalizedMovieId = body.movieId;
      const normalizedMediaType = body.mediaType || "movie";
      const isFavorite = user.favorites.some(
        (fav: FavoriteMovie) =>
          fav.movieId === normalizedMovieId && (fav.mediaType || "movie") === normalizedMediaType
      );

      if (isFavorite) {
        await User.updateOne(
          { email },
          { $pull: { favorites: { movieId: normalizedMovieId, mediaType: mediaEquals(normalizedMediaType) } } }
        );

        return NextResponse.json({ isFavorite: false, message: "Removed from favorites" });
      }

      if (!hasCapacity(user.favorites, MAX_FAVORITES)) {
        return NextResponse.json({ message: "Favorites list is full." }, { status: 409 });
      }

      await User.updateOne(
        { email },
        {
          $push: {
            favorites: {
              movieId: normalizedMovieId,
              title: body.movieTitle,
              posterPath: body.posterPath,
              voteAverage: body.voteAverage,
              releaseDate: body.releaseDate,
              mediaType: normalizedMediaType,
            },
          },
        }
      );

      return NextResponse.json({ isFavorite: true, message: "Added to favorites" });
    } catch (error) {
      console.error("Error updating favorites:", error);
      return NextResponse.json({ message: "Error updating favorites" }, { status: 500 });
    }
  },
  { windowMs: 60 * 1000, limit: 20 }
);
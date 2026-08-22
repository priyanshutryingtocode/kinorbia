import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { getSessionEmail } from "@/lib/session";
import { movieRefSchema, parseMovieBody, badRequest } from "@/lib/validators";
import { withRateLimit } from "@/lib/rateLimit";
import { MAX_FAVORITES } from "@/lib/bounds";
import { mediaEquals } from "@/lib/media";

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

      const normalizedMovieId = body.movieId;
      const normalizedMediaType = body.mediaType || "movie";

      // Atomic add-first toggle: the filter guarantees at most one entry per
      // (movieId, mediaType) and enforces capacity inside the same operation,
      // so concurrent toggles can neither duplicate favorites nor exceed the
      // limit. Whichever update wins determines the resulting state.
      const added = await User.updateOne(
        {
          email,
          favorites: {
            $not: {
              $elemMatch: {
                movieId: normalizedMovieId,
                mediaType: mediaEquals(normalizedMediaType),
              },
            },
          },
          $expr: { $lt: [{ $size: { $ifNull: ["$favorites", []] } }, MAX_FAVORITES] },
        },
        {
          $push: {
            favorites: {
              movieId: normalizedMovieId,
              title: body.movieTitle,
              posterPath: body.posterPath,
              voteAverage: body.voteAverage,
              releaseDate: body.releaseDate,
              mediaType: normalizedMediaType,
              genreIds: body.genreIds || [],
            },
          },
        }
      );

      if (added.modifiedCount > 0) {
        return NextResponse.json({ isFavorite: true, message: "Added to favorites" });
      }

      const removed = await User.updateOne(
        {
          email,
          "favorites.movieId": normalizedMovieId,
          "favorites.mediaType": mediaEquals(normalizedMediaType),
        },
        {
          $pull: {
            favorites: {
              movieId: normalizedMovieId,
              mediaType: mediaEquals(normalizedMediaType),
            },
          },
        }
      );

      if (removed.modifiedCount > 0) {
        return NextResponse.json({ isFavorite: false, message: "Removed from favorites" });
      }

      const userExists = await User.exists({ email });
      if (!userExists) {
        console.error("Session user was not found in the database.");
        return NextResponse.json({ message: "User record not found" }, { status: 404 });
      }

      return NextResponse.json({ message: "Favorites list is full." }, { status: 409 });
    } catch (error) {
      console.error("Error updating favorites:", error);
      return NextResponse.json({ message: "Error updating favorites" }, { status: 500 });
    }
  },
  { windowMs: 60 * 1000, limit: 20 }
);

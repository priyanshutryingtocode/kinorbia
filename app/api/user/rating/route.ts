import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import JournalEntry from "@/models/JournalEntry";
import { getSessionUser } from "@/lib/session";
import { rateMovieSchema, parseBody, badRequest } from "@/lib/validators";
import { withRateLimit } from "@/lib/rateLimit";
import { hasCapacity, MAX_FAVORITES } from "@/lib/bounds";
import { mediaEquals } from "@/lib/media";

export const POST = withRateLimit(
  async (req: Request) => {
    try {
      const { email, name } = await getSessionUser();
      if (!email) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }

      const body = await parseBody(req, rateMovieSchema);
      if (!body) {
        return badRequest("Movie and rating are required.");
      }

      const normalizedMovieId = body.movieId;
      const clampedRating = body.rating;
      const normalizedMediaType = body.mediaType;

      await dbConnect();
      const updateFavorite = await User.updateOne(
        {
          email,
          "favorites.movieId": normalizedMovieId,
          "favorites.mediaType": mediaEquals(normalizedMediaType),
        },
        {
          $set: {
            "favorites.$.personalRating": clampedRating,
            "favorites.$.title": body.movieTitle,
            "favorites.$.posterPath": body.posterPath,
            "favorites.$.voteAverage": body.voteAverage,
            "favorites.$.releaseDate": body.releaseDate,
          },
        }
      );

      if (updateFavorite.matchedCount === 0) {
        const userMovie = await User.findOne({ email }, { favorites: 1 });

        if (!userMovie) {
          return NextResponse.json({ message: "User record not found" }, { status: 404 });
        }

        if (!hasCapacity(userMovie.favorites, MAX_FAVORITES)) {
          return NextResponse.json({ message: "Favorites list is full." }, { status: 409 });
        }

        await User.updateOne(
          {
            email,
            "favorites.movieId": { $ne: normalizedMovieId },
          },
          {
            $push: {
              favorites: {
                movieId: normalizedMovieId,
                title: body.movieTitle,
                posterPath: body.posterPath,
                voteAverage: body.voteAverage,
                releaseDate: body.releaseDate,
                personalRating: clampedRating,
                mediaType: normalizedMediaType,
              },
            },
          }
        );
      }

      await JournalEntry.updateOne(
        { userEmail: email, movieId: normalizedMovieId, mediaType: mediaEquals(normalizedMediaType) },
        {
          $set: {
            rating: clampedRating,
            movieTitle: body.movieTitle,
            posterPath: body.posterPath || undefined,
          },
          $setOnInsert: {
            userEmail: email,
            userName: name || "KinOrbia user",
            movieId: normalizedMovieId,
            mediaType: normalizedMediaType,
            watchedAt: new Date(),
          },
        },
        { upsert: true }
      );

      return NextResponse.json({ rating: clampedRating });
    } catch (error) {
      console.error("Error updating movie rating:", error);
      return NextResponse.json({ message: "Error updating movie rating" }, { status: 500 });
    }
  },
  { windowMs: 60 * 1000, limit: 120 }
);
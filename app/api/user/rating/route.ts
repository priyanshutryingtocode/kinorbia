import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import JournalEntry from "@/models/JournalEntry";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { movieId, movieTitle, posterPath, voteAverage, releaseDate, rating } = await req.json();
    const normalizedMovieId = movieId?.toString();
    const numericRating = Number(rating);

    if (!normalizedMovieId || !movieTitle || !Number.isFinite(numericRating)) {
      return NextResponse.json({ message: "Movie and rating are required" }, { status: 400 });
    }

    const clampedRating = Math.min(10, Math.max(1, numericRating));

    await dbConnect();
    const updateFavorite = await User.updateOne(
      {
        email: session.user.email,
        "favorites.movieId": normalizedMovieId,
      },
      {
        $set: {
          "favorites.$.personalRating": clampedRating,
          "favorites.$.title": movieTitle,
          "favorites.$.posterPath": posterPath,
          "favorites.$.voteAverage": voteAverage,
          "favorites.$.releaseDate": releaseDate,
        },
      }
    );

    if (updateFavorite.matchedCount === 0) {
      const addFavorite = await User.updateOne(
        {
          email: session.user.email,
          "favorites.movieId": { $ne: normalizedMovieId },
        },
        {
          $push: {
            favorites: {
              movieId: normalizedMovieId,
              title: movieTitle,
              posterPath,
              voteAverage,
              releaseDate,
              personalRating: clampedRating,
            },
          },
        }
      );

      if (addFavorite.matchedCount === 0) {
        const userExists = await User.exists({ email: session.user.email });
        if (!userExists) {
          return NextResponse.json({ message: "User record not found" }, { status: 404 });
        }
      }
    }

    await JournalEntry.updateOne(
      { userEmail: session.user.email, movieId: normalizedMovieId },
      {
        $set: {
          rating: clampedRating,
          movieTitle,
          posterPath: posterPath || undefined,
        },
        $setOnInsert: {
          userEmail: session.user.email,
          userName: session.user.name || "KinOrbia user",
          movieId: normalizedMovieId,
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
}

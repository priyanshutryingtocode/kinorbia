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
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ message: "User record not found" }, { status: 404 });
    }

    if (!user.favorites) {
      user.favorites = [];
    }

    const favorite = user.favorites.find(
      (item: { movieId: string }) => item.movieId === normalizedMovieId
    );

    if (favorite) {
      favorite.personalRating = clampedRating;
    } else {
      user.favorites.push({
        movieId: normalizedMovieId,
        title: movieTitle,
        posterPath,
        voteAverage,
        releaseDate,
        personalRating: clampedRating,
      });
    }

    await user.save();

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

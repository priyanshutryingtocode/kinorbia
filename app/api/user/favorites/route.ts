import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import type { FavoriteMovie } from "@/types";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { movieId, title, posterPath, voteAverage, releaseDate } = await req.json();
    await dbConnect();

    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      console.error("Session user was not found in the database.");
      return NextResponse.json({ message: "User record not found" }, { status: 404 });
    }

    if (!user.favorites) {
      user.favorites = [];
    }

    const normalizedMovieId = movieId.toString();
    const isFavorite = user.favorites.some(
      (fav: FavoriteMovie) => fav.movieId === normalizedMovieId
    );

    if (isFavorite) {
      await User.updateOne(
        { email: session.user.email },
        { $pull: { favorites: { movieId: normalizedMovieId } } }
      );

      return NextResponse.json({ isFavorite: false, message: "Removed from favorites" });
    }

    await User.updateOne(
      { email: session.user.email },
      {
        $push: {
          favorites: {
            movieId: normalizedMovieId,
            title,
            posterPath,
            voteAverage,
            releaseDate,
          },
        },
      }
    );

    return NextResponse.json({ isFavorite: true, message: "Added to favorites" });
  } catch (error) {
    console.error("Error updating favorites:", error);
    return NextResponse.json({ message: "Error updating favorites" }, { status: 500 });
  }
}

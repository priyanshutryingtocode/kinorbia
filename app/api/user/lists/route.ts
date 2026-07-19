import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import MovieList from "@/models/MovieList";
import type { FavoriteMovie } from "@/types";

type ListSummary = {
  _id: { toString: () => string };
  title: string;
};

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const lists = await MovieList.find({ userEmail: session.user.email })
    .sort({ createdAt: -1 })
    .select({ title: 1 })
    .lean<ListSummary[]>();

  return NextResponse.json({
    lists: lists.map((list) => ({
      id: list._id.toString(),
      title: list.title,
    })),
  });
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { listId, movie } = await req.json() as {
      listId?: string;
      movie?: FavoriteMovie;
    };

    if (!listId || !movie?.movieId || !movie.title) {
      return NextResponse.json({ message: "List and movie are required" }, { status: 400 });
    }

    await dbConnect();
    const result = await MovieList.updateOne(
      {
        _id: listId,
        userEmail: session.user.email,
        "movies.movieId": { $ne: movie.movieId },
      },
      {
        $push: {
          movies: {
            movieId: movie.movieId,
            title: movie.title,
            posterPath: movie.posterPath,
            voteAverage: movie.voteAverage,
            releaseDate: movie.releaseDate,
            personalRating: movie.personalRating,
          },
        },
      }
    );

    if (result.matchedCount === 0) {
      const listExists = await MovieList.exists({ _id: listId, userEmail: session.user.email });
      if (!listExists) {
        return NextResponse.json({ message: "List not found" }, { status: 404 });
      }

      return NextResponse.json({ message: "Movie is already in this list" }, { status: 409 });
    }

    return NextResponse.json({ message: "Added to list" });
  } catch (error) {
    console.error("Error adding movie to list:", error);
    return NextResponse.json({ message: "Error adding movie to list" }, { status: 500 });
  }
}

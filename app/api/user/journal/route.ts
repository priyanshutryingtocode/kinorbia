import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import JournalEntry from "@/models/JournalEntry";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { movieId, movieTitle, posterPath } = await req.json();
    const normalizedMovieId = movieId?.toString();

    if (!normalizedMovieId || !movieTitle) {
      return NextResponse.json({ message: "Movie details are required" }, { status: 400 });
    }

    await dbConnect();

    await JournalEntry.updateOne(
      {
        userEmail: session.user.email,
        movieId: normalizedMovieId,
      },
      {
        $setOnInsert: {
          userEmail: session.user.email,
          userName: session.user.name || "KinOrbia user",
          movieId: normalizedMovieId,
          movieTitle,
          posterPath: posterPath || undefined,
          watchedAt: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ isWatched: true, message: "Marked as watched" });
  } catch (error) {
    console.error("Error marking movie as watched:", error);
    return NextResponse.json({ message: "Error marking movie as watched" }, { status: 500 });
  }
}

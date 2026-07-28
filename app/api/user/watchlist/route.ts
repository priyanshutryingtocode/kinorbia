import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const movieId = String(body.movieId || "");

  if (!movieId || !body.title) {
    return NextResponse.json({ message: "Movie is required." }, { status: 400 });
  }

  await dbConnect();
  const user = await User.findOne({ email: session.user.email.toLowerCase() });

  if (!user) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  const exists = user.watchlist?.some((movie: { movieId: string }) => movie.movieId === movieId);

  if (exists) {
    user.watchlist = user.watchlist.filter((movie: { movieId: string }) => movie.movieId !== movieId);
  } else {
    user.watchlist.push({
      movieId,
      title: body.title,
      posterPath: body.posterPath || null,
      voteAverage: body.voteAverage || 0,
      releaseDate: body.releaseDate,
      addedAt: new Date(),
    });
  }

  await user.save();
  return NextResponse.json({ isWatchlisted: !exists });
}

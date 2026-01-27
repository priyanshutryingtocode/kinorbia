import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { movieId, title, posterPath, voteAverage } = await req.json();
    await dbConnect();

    const user = await User.findOne({ email: session.user.email });

    // 🛡️ CRASH PREVENTION 1: Check if user exists in DB
    if (!user) {
      console.error("❌ Error: User found in Session but NOT in Database.");
      return NextResponse.json({ message: "User record not found" }, { status: 404 });
    }

    // 🛡️ CRASH PREVENTION 2: Ensure favorites array exists
    // (If the schema update didn't apply yet, this might be undefined)
    if (!user.favorites) {
      user.favorites = [];
    }

    // Check if movie is already in favorites
    const isFavorite = user.favorites.some((fav: any) => fav.movieId === movieId.toString());

    if (isFavorite) {
      // REMOVE it
      await User.updateOne(
        { email: session.user.email },
        { $pull: { favorites: { movieId: movieId.toString() } } }
      );
      console.log(`✅ Removed movie ${movieId} from favorites`);
      return NextResponse.json({ isFavorite: false, message: "Removed from favorites" });
    } else {
      // ADD it
      await User.updateOne(
        { email: session.user.email },
        { $push: { favorites: { movieId, title, posterPath, voteAverage } } }
      );
      console.log(`✅ Added movie ${movieId} to favorites`);
      return NextResponse.json({ isFavorite: true, message: "Added to favorites" });
    }

  } catch (error) {
    console.error("🔥 API Error:", error); // This prints the exact error in your terminal
    return NextResponse.json({ message: "Error updating favorites" }, { status: 500 });
  }
}
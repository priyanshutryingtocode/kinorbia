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

    const { movieId, rating } = await req.json();
    await dbConnect();

    await User.updateOne(
      { 
        email: session.user.email, 
        "favorites.movieId": movieId.toString() 
      },
      { 
        $set: { "favorites.$.personalRating": rating } 
      }
    );

    return NextResponse.json({ message: "Rating updated" });
  } catch (error) {
    console.error("Error updating rating:", error);
    return NextResponse.json({ message: "Error updating rating" }, { status: 500 });
  }
}
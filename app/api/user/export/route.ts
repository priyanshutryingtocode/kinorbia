import { NextResponse } from "next/server";
import User from "@/models/User";
import JournalEntry from "@/models/JournalEntry";
import MovieList from "@/models/MovieList";
import Review from "@/models/Review";
import { withAuthedUser } from "@/lib/session";

export const GET = withAuthedUser(
  async (_req, { email }) => {
    const [user, journal, reviews, lists] = await Promise.all([
      User.findOne({ email }).select("-password").lean(),
      JournalEntry.find({ userEmail: email }).sort({ watchedAt: 1 }).lean(),
      Review.find({ userEmail: email }).sort({ createdAt: 1 }).lean(),
      MovieList.find({ userEmail: email }).sort({ createdAt: 1 }).lean(),
    ]);

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const data = {
      exportedAt: new Date().toISOString(),
      user: {
        name: user.name,
        email: user.email,
        username: user.username,
        bio: user.bio,
        joinedAt: user.createdAt,
      },
      favorites: user.favorites || [],
      watchlist: user.watchlist || [],
      following: user.following || [],
      journal,
      reviews,
      lists,
    };

    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="kinorbia-export-${date}.json"`,
      },
    });
  },
  { windowMs: 60 * 1000, limit: 5, errorLabel: "exporting data" }
);

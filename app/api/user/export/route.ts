import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import JournalEntry from "@/models/JournalEntry";
import MovieList from "@/models/MovieList";
import Review from "@/models/Review";
import { getSessionEmail } from "@/lib/session";
import { withRateLimit } from "@/lib/rateLimit";

export const GET = withRateLimit(
  async () => {
    try {
      const email = await getSessionEmail();
      if (!email) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }

      await dbConnect();

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
    } catch {
      return NextResponse.json({ message: "Error exporting data" }, { status: 500 });
    }
  },
  { windowMs: 60 * 1000, limit: 5 }
);
import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import Comment from "@/models/Comment";
import JournalEntry from "@/models/JournalEntry";
import MovieList from "@/models/MovieList";
import Review from "@/models/Review";
import Notification from "@/models/Notification";
import { getSessionEmail } from "@/lib/session";
import { updateProfileSchema, parseBody, badRequest } from "@/lib/validators";
import { withRateLimit } from "@/lib/rateLimit";

export const PUT = withRateLimit(
  async (req: Request) => {
    try {
      const email = await getSessionEmail();
      if (!email) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }

      const body = await parseBody(req, updateProfileSchema);
      if (!body) {
        return badRequest("A valid name and bio are required.");
      }

      await dbConnect();

      const result = await User.findOneAndUpdate(
        { email },
        { name: body.name, bio: body.bio }
      );

      // Propagate the new display name to denormalized snapshots so old
      // comments, reviews, lists, journal entries, and notifications don't
      // keep the previous name forever.
      if (result && result.name !== body.name) {
        await Promise.all([
          Comment.updateMany({ userEmail: email }, { $set: { userName: body.name } }),
          JournalEntry.updateMany({ userEmail: email }, { $set: { userName: body.name } }),
          MovieList.updateMany({ userEmail: email }, { $set: { userName: body.name } }),
          Review.updateMany({ userEmail: email }, { $set: { userName: body.name } }),
          Notification.updateMany({ actorEmail: email }, { $set: { actorName: body.name } }),
        ]);
      }

      return NextResponse.json({ user: { name: body.name, bio: body.bio }, message: "Profile updated" });
    } catch {
      return NextResponse.json({ message: "Error updating profile" }, { status: 500 });
    }
  },
  { windowMs: 60 * 1000, limit: 30 }
);
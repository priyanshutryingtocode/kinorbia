import { NextResponse } from "next/server";
import User from "@/models/User";
import Comment from "@/models/Comment";
import JournalEntry from "@/models/JournalEntry";
import MovieList from "@/models/MovieList";
import Review from "@/models/Review";
import Notification from "@/models/Notification";
import { withAuthedUser } from "@/lib/session";
import { updateProfileSchema, parseBody, badRequest } from "@/lib/validators";

export const PUT = withAuthedUser(
  async (req, { email }) => {
    const body = await parseBody(req, updateProfileSchema);
    if (!body) {
      return badRequest("A valid name and bio are required.");
    }

    const result = await User.findOneAndUpdate(
      { email },
      { name: body.name, bio: body.bio },
      { projection: { name: 1 } }
    );

    if (!result) {
      return NextResponse.json({ message: "Account not found." }, { status: 404 });
    }

    if (result.name !== body.name) {
      await Promise.all([
        Comment.updateMany({ userEmail: email }, { $set: { userName: body.name } }),
        JournalEntry.updateMany({ userEmail: email }, { $set: { userName: body.name } }),
        MovieList.updateMany({ userEmail: email }, { $set: { userName: body.name } }),
        Review.updateMany({ userEmail: email }, { $set: { userName: body.name } }),
        Notification.updateMany({ actorEmail: email }, { $set: { actorName: body.name } }),
      ]);
    }

    return NextResponse.json({ user: { name: body.name, bio: body.bio }, message: "Profile updated" });
  },
  { windowMs: 60 * 1000, limit: 30, errorLabel: "updating profile" }
);

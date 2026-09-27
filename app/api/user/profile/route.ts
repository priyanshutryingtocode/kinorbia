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

    // Projects just `name` and deliberately leaves `new` unset, so `result` is
    // the document *before* the update -- which is the point: the fan-out below
    // should only run when the name actually changed.
    const result = await User.findOneAndUpdate(
      { email },
      { name: body.name, bio: body.bio },
      { projection: { name: 1 } }
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
  },
  { windowMs: 60 * 1000, limit: 30, errorLabel: "updating profile" }
);

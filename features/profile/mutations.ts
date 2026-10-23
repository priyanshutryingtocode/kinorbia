
import "server-only";

import dbConnect from "@/lib/dbConnect";
import Comment from "@/models/Comment";
import MovieList from "@/models/MovieList";
import Notification from "@/models/Notification";
import Review from "@/models/Review";
import User from "@/models/User";
import UserMovie from "@/models/UserMovie";

type MutationOptions = { session?: import("mongoose").ClientSession };

type UpdateProfileResult = "ok" | "no-account";

export async function updateShareActivity(
  email: string,
  share: boolean,
  { session }: MutationOptions = {}
): Promise<UpdateProfileResult> {
  await dbConnect();

  const opts = session ? { session } : {};
  const result = await User.findOneAndUpdate(
    { email },
    { shareActivity: share, shareActivityAsked: true },
    { projection: { shareActivity: 1 }, ...opts }
  );

  if (!result) {
    return "no-account";
  }

  if (!share) {
    await UserMovie.updateMany({ userEmail: email, "watched.broadcast": true }, { $set: { "watched.broadcast": false } }, opts);
  }

  return "ok";
}

export async function updateProfile(
  email: string,
  profile: { name: string; bio: string },
  { session }: MutationOptions = {}
): Promise<UpdateProfileResult> {
  await dbConnect();

  const opts = session ? { session } : {};
  const result = await User.findOneAndUpdate(
    { email },
    { name: profile.name, bio: profile.bio },
    { projection: { name: 1 }, ...opts }
  );

  if (!result) {
    return "no-account";
  }

  if (result.name !== profile.name) {
    await Promise.all([
      Comment.updateMany({ userEmail: email }, { $set: { userName: profile.name } }, opts),
      MovieList.updateMany({ userEmail: email }, { $set: { userName: profile.name } }, opts),
      Review.updateMany({ userEmail: email }, { $set: { userName: profile.name } }, opts),
      Notification.updateMany({ actorEmail: email }, { $set: { actorName: profile.name } }, opts),
    ]);
  }

  return "ok";
}

type FollowInput = {
  actorEmail: string;
  actorName: string;
  targetUserId: string;
  operation: "follow" | "unfollow";
};


type FollowOutcome =
  | { outcome: "changed"; actorUsername?: string | null; targetUsername?: string | null }
  | { outcome: "unchanged" | "no-target" };

export async function applyFollow(
  input: FollowInput,
  { session }: MutationOptions = {}
): Promise<FollowOutcome> {
  await dbConnect();
  const opts = session ? { session } : {};

  const [target, actor] = await Promise.all([
    User.findById(input.targetUserId)
      .select("_id email name username")
      .session(session ?? null)
      .lean<{
        _id: { toString: () => string };
        email: string;
        name?: string | null;
        username?: string | null;
      } | null>(),
    User.findOne({ email: input.actorEmail })
      .select("username")
      .session(session ?? null)
      .lean<{ username?: string | null } | null>(),
  ]);

  if (!target?.email || !actor) {
    return { outcome: "no-target" };
  }

  const targetEmail = target.email.toLowerCase();
  if (targetEmail === input.actorEmail) {
    return { outcome: "no-target" };
  }

  if (input.operation === "follow") {
    const followed = await User.updateOne(
      { email: input.actorEmail, following: { $ne: targetEmail } },
      { $addToSet: { following: targetEmail } },
      opts
    );

    if (followed.modifiedCount === 0) {
      return { outcome: "unchanged" };
    }

    await Notification.create([{
      userEmail: targetEmail,
      type: "follow",
      actorEmail: input.actorEmail,
      actorName: input.actorName,
      targetType: "user",
      targetId: target._id.toString(),
      targetTitle: target.username || "",
    }],
    opts);
  } else {
    const unfollowed = await User.updateOne(
      { email: input.actorEmail, following: targetEmail },
      { $pull: { following: targetEmail } },
      opts
    );

    if (unfollowed.modifiedCount === 0) {
      return { outcome: "unchanged" };
    }

    await Notification.deleteOne(
      { userEmail: targetEmail, type: "follow", actorEmail: input.actorEmail },
      opts
    );
  }

  return {
    outcome: "changed",
    actorUsername: actor.username,
    targetUsername: target.username,
  };
}

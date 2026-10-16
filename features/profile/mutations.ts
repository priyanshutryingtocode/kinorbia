
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

// Turning sharing off has to retract what was already broadcast, not just stop new events:
// `watched.broadcast` was stamped at write time precisely so the feed never has to consult
// the follower's flag, which means the flag alone can no longer hide the past.
export async function updateShareActivity(
  email: string,
  share: boolean,
  { session }: MutationOptions = {}
): Promise<UpdateProfileResult> {
  await dbConnect();

  const opts = session ? { session } : {};
  const result = await User.findOneAndUpdate(
    { email },
    // `shareActivityAsked` moves with the answer so the prompt never returns.
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

  // The cascade is conditional on the stored name actually differing. Without that
  // guard every bio-only edit would rewrite `userName` on every collection that stores it.
  //
  // Watch history is absent because a usermovies row carries no name -- the name was
  // denormalized onto the row that already holds the title.
  if (result.name !== profile.name) {
    await Promise.all([
      Comment.updateMany({ userEmail: email }, { $set: { userName: profile.name } }, opts),
      MovieList.updateMany({ userEmail: email }, { $set: { userName: profile.name } }, opts),
      Review.updateMany({ userEmail: email }, { $set: { userName: profile.name } }, opts),
      // Notifications key the actor by email, so this one follows `actorEmail`.
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

// Applies a follow or unfollow and reconciles the notification. Returns "no-target" rather
// than throwing when the target or actor is missing: the action treats all three outcomes
// alike, and distinguishing them would leak account existence into a UI path.
export async function applyFollow(
  input: FollowInput,
  { session }: MutationOptions = {}
): Promise<FollowOutcome> {
  await dbConnect();
  const opts = session ? { session } : {};

  const [target, actor] = await Promise.all([
    User.findById(input.targetUserId)
      .select("_id email name username")
      // `.lean({ session })` silently drops the session in this Mongoose version --
      // the query then reads outside the transaction and finds nothing. `.session(s)`
      // is the form that actually binds it.
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

  // Following yourself is not a thing, and the notification it would create would be
  // the member notifying themselves.
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

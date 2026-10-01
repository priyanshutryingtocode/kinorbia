"use server";

import { revalidatePath } from "next/cache";
import dbConnect from "@/lib/dbConnect";
import Notification from "@/models/Notification";
import User from "@/models/User";
import { requireUser, getString, revalidateRoute } from "@/lib/actions";
import { isObjectId } from "@/lib/objectId";
import { isEmailVerified, VERIFICATION_REQUIRED_MESSAGE } from "@/lib/verification";

export type FollowState = { error?: string } | undefined;

type FollowTarget = {
  _id: { toString: () => string };
  email: string;
  name?: string | null;
  username?: string | null;
};

type FollowActor = {
  username?: string | null;
};

function isRelevantPath(path: string) {
  return /^\/(?:profile|activity|u\/[a-z0-9_-]+(?:\/(?:followers|following))?)$/.test(path);
}

function addUserPaths(paths: Set<string>, username?: string | null) {
  if (!username || !/^[a-z0-9_-]+$/i.test(username)) {
    return;
  }

  paths.add(`/u/${username}`);
  paths.add(`/u/${username}/followers`);
  paths.add(`/u/${username}/following`);
}

export async function toggleFollow(_prevState: FollowState, formData: FormData): Promise<FollowState> {
  const { email, name } = await requireUser();
  const targetUserId = getString(formData, "targetUserId");
  const operation = getString(formData, "operation") === "unfollow" ? "unfollow" : "follow";
  const submittedPath = getString(formData, "path");

  if (!isObjectId(targetUserId)) {
    return;
  }

  // A follow puts your name in someone else's public follower list, so it is
  // gated like any other public appearance. Unfollow is never gated: a user
  // must always be able to withdraw.
  if (operation === "follow" && !(await isEmailVerified(email))) {
    return { error: VERIFICATION_REQUIRED_MESSAGE };
  }

  await dbConnect();
  const [target, actor] = await Promise.all([
    User.findById(targetUserId)
      .select("_id email name username")
      .lean<FollowTarget | null>(),
    User.findOne({ email })
      .select("username")
      .lean<FollowActor | null>(),
  ]);

  if (!target?.email || !actor) {
    return;
  }

  const targetEmail = target.email.toLowerCase();
  if (targetEmail === email) {
    return;
  }

  let modified = false;

  try {
    if (operation === "follow") {
      const followed = await User.updateOne(
        { email, following: { $ne: targetEmail } },
        { $addToSet: { following: targetEmail } }
      );
      if (followed.modifiedCount > 0) {
        modified = true;
        await Notification.create({
          userEmail: targetEmail,
          type: "follow",
          actorEmail: email,
          actorName: name,
          targetType: "user",
          targetId: target._id.toString(),
          targetTitle: target.username || "",
        });
      }
    } else {
      const unfollowed = await User.updateOne(
        { email, following: targetEmail },
        { $pull: { following: targetEmail } }
      );
      if (unfollowed.modifiedCount > 0) {
        modified = true;
        await Notification.deleteOne({
          userEmail: targetEmail,
          type: "follow",
          actorEmail: email,
        });
      }
    }
  } catch (error) {
    console.error("Error toggling follow:", error);
  }

  if (!modified) {
    return;
  }

  const relevantPaths = new Set<string>(["/profile"]);
  if (isRelevantPath(submittedPath)) {
    relevantPaths.add(submittedPath);
  }
  addUserPaths(relevantPaths, actor.username);
  addUserPaths(relevantPaths, target.username);

  for (const path of relevantPaths) {
    // Entries are either derived from the two usernames or supplied by the
    // caller, so both go through the same check rather than trusting the Set.
    revalidateRoute(path);
  }
  revalidatePath("/activity");
}

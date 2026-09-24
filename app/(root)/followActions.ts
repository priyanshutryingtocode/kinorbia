"use server";

import { revalidatePath } from "next/cache";
import { isValidObjectId } from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Notification from "@/models/Notification";
import User from "@/models/User";
import { requireUser, getString } from "@/lib/actions";

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

export async function toggleFollow(formData: FormData) {
  const { email, name } = await requireUser();
  const targetUserId = getString(formData, "targetUserId");
  const operation = getString(formData, "operation") === "unfollow" ? "unfollow" : "follow";
  const submittedPath = getString(formData, "path");

  if (
    !/^[a-f0-9]{24}$/i.test(targetUserId) ||
    !isValidObjectId(targetUserId)
  ) {
    return;
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
    revalidatePath(path);
  }
  revalidatePath("/activity");
}

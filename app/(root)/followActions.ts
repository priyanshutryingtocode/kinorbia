"use server";

import { revalidatePath } from "next/cache";
import dbConnect from "@/lib/dbConnect";
import Notification from "@/models/Notification";
import User from "@/models/User";
import { requireUser, getString } from "@/lib/actions";

export async function toggleFollow(formData: FormData) {
  const { email, name } = await requireUser();
  const targetEmail = getString(formData, "targetEmail").toLowerCase();
  const path = getString(formData, "path") || "/activity";

  if (!targetEmail || targetEmail === email) {
    return;
  }

  await dbConnect();
  const target = await User.findOne({ email: targetEmail }).select("email username").lean<{ email: string; username?: string | null } | null>();
  if (!target) {
    return;
  }

  try {
    // Atomic add-first toggle: whichever update actually modifies the
    // document decides whether a notification is created or cleaned up.
    const added = await User.updateOne(
      { email, following: { $ne: targetEmail } },
      { $addToSet: { following: targetEmail } }
    );

    if (added.modifiedCount > 0) {
      await Notification.create({
        userEmail: targetEmail,
        type: "follow",
        actorEmail: email,
        actorName: name,
        targetType: "user",
        targetId: targetEmail,
        targetTitle: target.username || targetEmail,
      });
    } else {
      const removed = await User.updateOne(
        { email, following: targetEmail },
        { $pull: { following: targetEmail } }
      );
      if (removed.modifiedCount > 0) {
        await Notification.deleteOne({
          userEmail: targetEmail,
          type: "follow",
          actorEmail: email,
        });
      }
    }
  } catch (error) {
    console.error("Error toggling follow:", error);
    return;
  }

  revalidatePath(path);
  revalidatePath("/profile");
  if (target.username) {
    revalidatePath(`/u/${target.username}`);
    revalidatePath(`/u/${target.username}/followers`);
    revalidatePath(`/u/${target.username}/following`);
  }
}

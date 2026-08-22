"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import Notification from "@/models/Notification";
import User from "@/models/User";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function toggleFollow(formData: FormData) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const email = session.user.email.toLowerCase();
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
        actorName: session.user.name || "KinOrbia user",
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
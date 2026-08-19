"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import Notification from "@/models/Notification";
import User from "@/models/User";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
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
  const target = await User.findOne({ email: targetEmail }).select("email username").lean();
  if (!target) {
    return;
  }

  const user = await User.findOne({ email }).select("following");
  const following: string[] = user?.following || [];
  const isFollowing = following.includes(targetEmail);

  await User.updateOne(
    { email },
    isFollowing ? { $pull: { following: targetEmail } } : { $addToSet: { following: targetEmail } }
  );

  if (isFollowing) {
    await Notification.deleteOne({
      userEmail: targetEmail,
      type: "follow",
      actorEmail: email,
    });
  } else {
    await Notification.create({
      userEmail: targetEmail,
      type: "follow",
      actorEmail: email,
      actorName: session.user.name || "KinOrbia user",
      targetType: "user",
      targetId: targetEmail,
      targetTitle: target.username || targetEmail,
    });
  }

  revalidatePath(path);
  revalidatePath("/profile");
}
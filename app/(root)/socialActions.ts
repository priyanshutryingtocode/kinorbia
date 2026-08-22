"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import MovieList from "@/models/MovieList";
import Notification from "@/models/Notification";
import Review from "@/models/Review";
import { isObjectId } from "@/lib/objectId";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function modelFor(type: string) {
  return type === "list" ? MovieList : Review;
}

export async function toggleSocialAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const type = getString(formData, "type");
  const id = getString(formData, "id");
  const action = getString(formData, "action");
  const path = getString(formData, "path") || (type === "list" ? "/lists" : "/reviews");

  if (!id || !isObjectId(id) || !["review", "list"].includes(type) || !["like", "save"].includes(action)) {
    return;
  }

  await dbConnect();
  const Model = modelFor(type);
  const field = action === "like" ? "likedBy" : "savedBy";
  const email = session.user.email.toLowerCase();

  try {
    // Atomic add-first toggle: the update that actually wins decides whether
    // a notification is created or cleaned up, so concurrent toggles can't
    // produce duplicate or orphaned notifications.
    const added = await Model.updateOne(
      { _id: id, visibility: "public", [field]: { $ne: email } },
      { $addToSet: { [field]: email } }
    );

    let hasValue: boolean;
    if (added.modifiedCount > 0) {
      hasValue = false;
    } else {
      const removed = await Model.updateOne(
        { _id: id, visibility: "public", [field]: email },
        { $pull: { [field]: email } }
      );
      hasValue = true;
      if (removed.matchedCount === 0) {
        return;
      }
    }

    const doc = await Model.findOne({ _id: id })
      .select("userEmail movieTitle title movieId mediaType")
      .lean<{
        userEmail?: string;
        movieTitle?: string;
        title?: string;
        movieId?: string;
        mediaType?: "movie" | "tv";
      } | null>();

    const ownerEmail = (doc?.userEmail || "").toLowerCase();

    if (ownerEmail && ownerEmail !== email) {
      if (hasValue) {
        await Notification.deleteOne({
          userEmail: ownerEmail,
          type: action,
          actorEmail: email,
          targetType: type,
          targetId: id,
        });
      } else {
        await Notification.create({
          userEmail: ownerEmail,
          type: action,
          actorEmail: email,
          actorName: session.user.name || "KinOrbia user",
          targetType: type,
          targetId: id,
          targetTitle: type === "review" ? doc?.movieTitle || "" : doc?.title || "",
          movieId: type === "review" ? doc?.movieId || "" : "",
          mediaType: type === "review" ? doc?.mediaType || "movie" : "movie",
        });
      }
    }
  } catch (error) {
    console.error("Error updating social action:", error);
    return;
  }

  revalidatePath(path);
  if (type === "list") {
    revalidatePath("/lists");
    revalidatePath(`/lists/${id}`);
  } else {
    revalidatePath("/reviews");
    revalidatePath("/profile");
  }
}

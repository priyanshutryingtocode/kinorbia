"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import MovieList from "@/models/MovieList";
import Notification from "@/models/Notification";
import Review from "@/models/Review";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
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

  if (!id || !["review", "list"].includes(type) || !["like", "save"].includes(action)) {
    return;
  }

  await dbConnect();
  const Model = modelFor(type);
  const field = action === "like" ? "likedBy" : "savedBy";
  const email = session.user.email.toLowerCase();
  const doc = await Model.findOne({ _id: id, visibility: "public" }).select(
    `${field} userEmail movieTitle title movieId mediaType`
  );

  if (!doc) {
    return;
  }

  const hasValue = (doc[field] || []).includes(email);
  await Model.updateOne(
    { _id: id, visibility: "public" },
    hasValue ? { $pull: { [field]: email } } : { $addToSet: { [field]: email } }
  );

  const ownerEmail = (doc.userEmail || "").toLowerCase();

  if (ownerEmail && ownerEmail !== email) {
    const notification = {
      userEmail: ownerEmail,
      type: action,
      actorEmail: email,
      actorName: session.user.name || "KinOrbia user",
      targetType: type,
      targetId: id,
      targetTitle: type === "review" ? doc.movieTitle || "" : doc.title || "",
      movieId: type === "review" ? doc.movieId || "" : "",
      mediaType: type === "review" ? doc.mediaType || "movie" : "movie",
    };

    if (hasValue) {
      await Notification.deleteOne({
        userEmail: ownerEmail,
        type: action,
        actorEmail: email,
        targetType: type,
        targetId: id,
      });
    } else {
      await Notification.create(notification);
    }
  }

  revalidatePath(path);
  revalidatePath(type === "list" ? `/lists/${id}` : "/reviews");
}

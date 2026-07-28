"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import MovieList from "@/models/MovieList";
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
  const doc = await Model.findOne({ _id: id, visibility: "public" }).select(field);

  if (!doc) {
    return;
  }

  const hasValue = (doc[field] || []).includes(email);
  await Model.updateOne(
    { _id: id, visibility: "public" },
    hasValue ? { $pull: { [field]: email } } : { $addToSet: { [field]: email } }
  );

  revalidatePath(path);
  revalidatePath(type === "list" ? `/lists/${id}` : "/reviews");
}

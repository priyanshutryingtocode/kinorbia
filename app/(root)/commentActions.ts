"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import Comment from "@/models/Comment";
import MovieList from "@/models/MovieList";
import Notification from "@/models/Notification";
import Review from "@/models/Review";
import { rateLimit } from "@/lib/rateLimit";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function isObjectId(value: string) {
  return /^[0-9a-fA-F]{24}$/.test(value);
}

export async function createComment(formData: FormData) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const email = session.user.email.toLowerCase();

  if (!rateLimit(`comments:${email}`, { limit: 10, windowMs: 60 * 1000 })) {
    return;
  }

  const parentType = getString(formData, "parentType");
  const parentId = getString(formData, "parentId");
  const body = getString(formData, "body");
  const path = getString(formData, "path");

  if (!["review", "list"].includes(parentType) || !isObjectId(parentId) || !body) {
    return;
  }

  await dbConnect();
  const Model = parentType === "review" ? Review : MovieList;
  const parent = await Model.findOne({ _id: parentId, visibility: "public" })
    .select("userEmail movieTitle title movieId mediaType")
    .lean<{
      userEmail: string;
      movieTitle?: string;
      title?: string;
      movieId?: string;
      mediaType?: "movie" | "tv";
    } | null>();

  if (!parent) {
    return;
  }

  await Comment.create({
    parentType,
    parentId,
    userEmail: email,
    userName: session.user.name || "KinOrbia user",
    body,
  });

  if (parent.userEmail !== email) {
    await Notification.create({
      userEmail: parent.userEmail,
      type: "comment",
      actorEmail: email,
      actorName: session.user.name || "KinOrbia user",
      targetType: parentType as "review" | "list",
      targetId: parentId,
      targetTitle: parentType === "review" ? parent.movieTitle || "" : parent.title || "",
      movieId: parentType === "review" ? parent.movieId || "" : "",
      mediaType: parentType === "review" ? parent.mediaType || "movie" : "movie",
    });
  }

  if (path) {
    revalidatePath(path);
  }
}

export async function deleteComment(formData: FormData) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const commentId = getString(formData, "commentId");
  const path = getString(formData, "path");

  if (!isObjectId(commentId)) {
    return;
  }

  await dbConnect();
  const email = session.user.email.toLowerCase();
  const comment = await Comment.findOne({ _id: commentId, userEmail: email }).select(
    "parentType parentId userEmail"
  );

  if (!comment) {
    return;
  }

  await Comment.deleteOne({ _id: commentId, userEmail: email });

  if (comment.parentId && comment.parentType) {
    await Notification.deleteMany({
      type: "comment",
      actorEmail: email,
      targetType: comment.parentType,
      targetId: comment.parentId.toString(),
    });
  }

  if (path) {
    revalidatePath(path);
  }
}
import "server-only";

import dbConnect from "@/lib/dbConnect";
import { publiclyVisible } from "@/lib/visibility";
import { normalizeMediaType } from "@/lib/media";
import mongoose from "mongoose";
import MovieList from "@/models/MovieList";
import Notification from "@/models/Notification";
import Review from "@/models/Review";

type MutationOptions = { session?: mongoose.ClientSession };

export async function markNotificationsRead(
  email: string,
  id?: string,
  { session }: MutationOptions = {}
): Promise<number> {
  await dbConnect();
  const result = id
    ? await Notification.updateOne(
        { _id: id, userEmail: email },
        { $set: { read: true } },
        session ? { session } : undefined
      )
    : await Notification.updateMany(
        { userEmail: email, read: false },
        { $set: { read: true } },
        session ? { session } : undefined
      );

  return result.modifiedCount;
}
type ToggleSocialInput = {
  actorEmail: string;
  actorName: string;
  targetId: string;
  targetType: "review" | "list";
  action: "like" | "save";
};

export async function applySocialToggle(
  input: ToggleSocialInput,
  { session }: MutationOptions = {}
): Promise<boolean | null> {
  await dbConnect();
  const opts = session ? { session } : {};

  const Model = input.targetType === "list" ? MovieList : Review;
  const field = input.action === "like" ? "likedBy" : "savedBy";

  const added = await Model.updateOne(
    { _id: input.targetId, ...publiclyVisible(), [field]: { $ne: input.actorEmail } },
    { $addToSet: { [field]: input.actorEmail } },
    opts
  );

  let wasRemoved: boolean;

  if (added.modifiedCount > 0) {
    wasRemoved = false;
  } else {
    const removed = await Model.updateOne(
      { _id: input.targetId, ...publiclyVisible(), [field]: input.actorEmail },
      { $pull: { [field]: input.actorEmail } },
      opts
    );
    wasRemoved = true;

    if (removed.matchedCount === 0) {
      return null;
    }
  }

  const doc = await Model.findOne({ _id: input.targetId })
    .select("userEmail title movieId mediaType")
    .session(session ?? null)
    .lean<{
      userEmail?: string;
      title?: string;
      movieId?: string;
      mediaType?: "movie" | "tv";
    } | null>();

  const ownerEmail = (doc?.userEmail || "").toLowerCase();

  // Never notify someone of their own action.
  if (ownerEmail && ownerEmail !== input.actorEmail) {
    if (wasRemoved) {
      await Notification.deleteOne(
        {
          userEmail: ownerEmail,
          type: input.action,
          actorEmail: input.actorEmail,
          targetType: input.targetType,
          targetId: input.targetId,
        },
        opts
      );
    } else {
      await Notification.create([{
        userEmail: ownerEmail,
        type: input.action,
        actorEmail: input.actorEmail,
        actorName: input.actorName,
        targetType: input.targetType,
        targetId: input.targetId,
        targetTitle: input.targetType === "review" ? doc?.title || "" : doc?.title || "",
        movieId: input.targetType === "review" ? doc?.movieId || "" : "",
        mediaType: input.targetType === "review" ? normalizeMediaType(doc?.mediaType) : "movie",
      }],
      opts);
    }
  }

  return wasRemoved;
}

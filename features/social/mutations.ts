import "server-only";

import dbConnect from "@/lib/dbConnect";
import { publiclyVisible } from "@/lib/visibility";
import { normalizeMediaType } from "@/lib/media";
import mongoose from "mongoose";
import MovieList from "@/models/MovieList";
import Notification from "@/models/Notification";
import Review from "@/models/Review";

// `session` is an option so a mutation can be composed into a caller's transaction
// as well as run standalone.
type MutationOptions = { session?: mongoose.ClientSession };

export async function markNotificationsRead(
  email: string,
  id?: string,
  { session }: MutationOptions = {}
): Promise<number> {
  await dbConnect();

  // With an id -> updateOne, and the filter carries `userEmail` as well as `_id` so
  // someone else's notification cannot be marked. Without one -> updateMany scoped
  // to `read: false`, or "mark all" clears a single row and then does nothing.
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

// Applies a like or a save, then reconciles the owner's notification.
//
// Add-first toggle: the update that actually wins decides whether a notification is
// created or cleaned up, so two concurrent toggles cannot produce duplicate or
// orphaned notifications. Returns whether the actor now has the action set.
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

  let hasValue: boolean;

  if (added.modifiedCount > 0) {
    hasValue = false;
  } else {
    const removed = await Model.updateOne(
      { _id: input.targetId, ...publiclyVisible(), [field]: input.actorEmail },
      { $pull: { [field]: input.actorEmail } },
      opts
    );
    hasValue = true;

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
    if (hasValue) {
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
        // Both branches read the title the same way; the split is kept because the
        // shape differs for a list, which has no movieId.
        targetTitle: input.targetType === "review" ? doc?.title || "" : doc?.title || "",
        movieId: input.targetType === "review" ? doc?.movieId || "" : "",
        mediaType: input.targetType === "review" ? normalizeMediaType(doc?.mediaType) : "movie",
      }],
      opts);
    }
  }

  return hasValue;
}

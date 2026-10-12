import mongoose from "mongoose";
import { mediaTypeField } from "./shared";

const NotificationSchema = new mongoose.Schema({
  // The recipient, not the author. `actorEmail`/`actorName` below carry who
  // caused it, so this one is the only field here that is indexed for lookups.
  userEmail: {
    type: String,
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ["like", "save", "comment", "follow"],
    required: true,
  },
  actorEmail: {
    type: String,
    required: true,
  },
  actorName: {
    type: String,
    required: true,
  },
  targetType: {
    type: String,
    enum: ["review", "list", "user"],
    default: "user",
  },
  // Deliberately a String and not an ObjectId: a follow notification's target is
  // an email, and a review's is an ObjectId. One column keeps the three target
  // kinds in a single list rather than three nullable ones.
  targetId: {
    type: String,
    default: "",
  },
  // A snapshot of the title as it was when the notification was created. Stored
  // rather than joined so a notification still renders if the target is deleted,
  // and so the list does not need a populate.
  targetTitle: {
    type: String,
    default: "",
  },
  commentId: {
    type: String,
    default: "",
  },
  movieId: {
    type: String,
    default: "",
  },
  mediaType: mediaTypeField,
  read: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

NotificationSchema.index({ userEmail: 1, read: 1, createdAt: -1 });

export default mongoose.models?.Notification || mongoose.model("Notification", NotificationSchema);
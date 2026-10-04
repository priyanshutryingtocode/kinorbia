import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema({
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
  targetId: {
    type: String,
    default: "",
  },
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
  mediaType: {
    type: String,
    enum: ["movie", "tv"],
    default: "movie",
  },
  read: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

NotificationSchema.index({ userEmail: 1, read: 1, createdAt: -1 });

export default mongoose.models?.Notification || mongoose.model("Notification", NotificationSchema);

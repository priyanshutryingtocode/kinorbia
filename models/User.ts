import mongoose from "mongoose";
import { tokenField } from "./shared";

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    select: false,
  },
  image: {
    type: String,
  },
  username: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
  },
  bio: {
    type: String,
    default: "",
    maxLength: 160,
  },
  provider: {
    type: String,
    default: "credentials",
  },
  emailVerified: {
    type: Date,
    default: null,
  },
  sessionsInvalidBefore: {
    type: Date,
    default: null,
  },
  // Row counts per state. A `countDocuments` cannot enforce the cap -- counting and
  // inserting are two operations -- but a conditional `$inc` on one document is atomic.
  // Denormalized, so it can drift: `npm run check:media-counts` reconciles it.
  favoritesCount: { type: Number, default: 0 },
  watchlistCount: { type: Number, default: 0 },
  verifyToken: tokenField,
  resetToken: tokenField,
  following: { type: [String], default: [] },
}, { timestamps: true });

UserSchema.index({ following: 1 });
UserSchema.index({ "verifyToken.token": 1 });
UserSchema.index({ "resetToken.token": 1 });

export default mongoose.models?.User || mongoose.model("User", UserSchema);
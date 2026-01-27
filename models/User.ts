import mongoose from "mongoose";

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
  bio: {
    type: String,
    default: "",
    maxLength: 160,
  },
  provider: {
    type: String,
    default: "credentials",
  },
  // 👇 THIS IS THE CRITICAL PART
  favorites: [
    {
      movieId: { type: String, required: true },
      title: { type: String, required: true },
      posterPath: { type: String },
      voteAverage: { type: Number },
      addedAt: { type: Date, default: Date.now },
    },
  ],
}, { timestamps: true });

// This prevents "Model already compiled" errors in Next.js
export default mongoose.models?.User || mongoose.model("User", UserSchema);
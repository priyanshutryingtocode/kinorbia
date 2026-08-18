import mongoose from "mongoose";

const ReviewSchema = new mongoose.Schema({
  userEmail: {
    type: String,
    required: true,
    index: true,
  },
  userName: {
    type: String,
    required: true,
  },
  movieId: {
    type: String,
  },
  mediaType: {
    type: String,
    enum: ["movie", "tv"],
    default: "movie",
  },
  movieTitle: {
    type: String,
    required: true,
  },
  posterPath: {
    type: String,
  },
  body: {
    type: String,
    required: true,
    maxLength: 1200,
  },
  visibility: {
    type: String,
    enum: ["public", "private"],
    default: "public",
    index: true,
  },
  likedBy: {
    type: [String],
    default: [],
  },
  savedBy: {
    type: [String],
    default: [],
  },
}, { timestamps: true });

export default mongoose.models?.Review || mongoose.model("Review", ReviewSchema);

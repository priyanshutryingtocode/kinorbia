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
  movieTitle: {
    type: String,
    required: true,
  },
  posterPath: {
    type: String,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 10,
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
}, { timestamps: true });

export default mongoose.models?.Review || mongoose.model("Review", ReviewSchema);

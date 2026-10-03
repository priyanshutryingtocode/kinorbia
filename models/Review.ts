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
  spoiler: {
    type: Boolean,
    default: false,
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

ReviewSchema.index({ movieId: 1, mediaType: 1, visibility: 1, createdAt: -1 });

// Serves the two orderings the site actually reads: the public indexes, which
// filter on visibility and sort by date, and a profile's own reviews, which
// filter on author and sort by date. Without these, both fall back to a
// COLLSCAN plus an in-memory sort of every matching document, because the
// visibility and userEmail indexes each cover only half the query.
//
// Note that the public feed filters with an `$or` (see `publiclyVisible`), which
// MongoDB satisfies by running each arm as its own sub-plan. Each arm still gets
// the index for its own leading key, which is why these help rather than being
// defeated -- verified with explain() rather than assumed.
ReviewSchema.index({ visibility: 1, createdAt: -1, _id: -1 });
ReviewSchema.index({ userEmail: 1, createdAt: -1, _id: -1 });

export default mongoose.models?.Review || mongoose.model("Review", ReviewSchema);

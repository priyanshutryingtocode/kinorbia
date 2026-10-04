import mongoose from "mongoose";

const JournalEntrySchema = new mongoose.Schema({
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
  watchedAt: {
    type: Date,
    required: true,
  },
}, { timestamps: true });

JournalEntrySchema.index(
  { userEmail: 1, movieId: 1, mediaType: 1 },
  {
    unique: true,
    partialFilterExpression: { movieId: { $type: "string" } },
  }
);

export default mongoose.models?.JournalEntry || mongoose.model("JournalEntry", JournalEntrySchema);

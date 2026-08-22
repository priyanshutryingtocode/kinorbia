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
  note: {
    type: String,
    maxLength: 1000,
  },
}, { timestamps: true });

// One "watched" entry per (user, TMDB id, media type). Manual entries have no
// movieId and are exempt via the partial filter. The backfill script dedupes
// legacy data before this index builds.
JournalEntrySchema.index(
  { userEmail: 1, movieId: 1, mediaType: 1 },
  {
    unique: true,
    partialFilterExpression: { movieId: { $type: "string" } },
  }
);

export default mongoose.models?.JournalEntry || mongoose.model("JournalEntry", JournalEntrySchema);

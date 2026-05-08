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
  movieTitle: {
    type: String,
    required: true,
  },
  posterPath: {
    type: String,
  },
  rating: {
    type: Number,
    min: 1,
    max: 10,
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

export default mongoose.models?.JournalEntry || mongoose.model("JournalEntry", JournalEntrySchema);

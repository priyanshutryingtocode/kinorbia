import mongoose from "mongoose";

// Deliberately shares nothing from ./shared.ts. `userEmail` is unique here (one conversation per
// user), while `authorFields.userEmail` is index-only -- reusing it would silently drop that
// constraint. `movies` is TMDB's snake_case, kept verbatim for replay without re-normalising.

const ConversationMessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxLength: 2000,
    },
    movies: {
      type: [
        {
          id: mongoose.Schema.Types.Mixed,
          title: String,
          poster_path: String,
          release_date: String,
          vote_average: Number,
          original_language: String,
          genre_ids: [Number],
        },
      ],
      // Explicitly not defaulted to `[]`: a turn with no recommendations is
      // absent rather than empty, so "the model returned nothing" and "the model
      // was never asked" stay distinguishable.
      default: undefined,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const ConversationSchema = new mongoose.Schema(
  {
    userEmail: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    messages: {
      type: [ConversationMessageSchema],
      default: [],
    },
  },
  { timestamps: true }
);

export const MAX_CONVERSATION_MESSAGES = 24;

export default mongoose.models?.Conversation ||
  mongoose.model("Conversation", ConversationSchema);
import mongoose from "mongoose";
import { mediaTypeField } from "./shared";

// One document per (user, title) holding all three states: favorited, watchlisted, watched.
// The unique index below is what makes the duplicate rows the old embedded arrays allowed
// impossible; the TMDB fields are a cache, refreshed by whichever write touched the row.
const UserMovieSchema = new mongoose.Schema(
  {
    userEmail: { type: String, required: true },

    movieId: { type: String, required: true },

    mediaType: mediaTypeField,

    // TMDB snapshot, refreshed on every write to this document.
    title: { type: String, required: true },
    posterPath: { type: String, default: null },
    voteAverage: { type: Number, default: 0 },
    releaseDate: { type: String, default: null },
    genreIds: { type: [Number], default: [] },

    // `favorite.addedAt` rather than a bare `addedAt` plus a boolean: the timestamp is
    // only meaningful while the state is on, and an unset sub-document is the clearest
    // possible statement of "not a favorite".
    favorite: {
      addedAt: { type: Date },
      personalRating: { type: Number, default: 0 },
      _id: false,
    },

    watchlist: {
      addedAt: { type: Date },
      _id: false,
    },

    watched: {
      watchedAt: { type: Date },
      _id: false,
    },
  },
  { timestamps: true }
);

// The uniqueness guarantee the embedded arrays could not express.
UserMovieSchema.index(
  { userEmail: 1, movieId: 1, mediaType: 1 },
  {
    unique: true,
    // A row written before `mediaType` existed has it defaulted by the schema, so the
    // partial filter is here for the same reason as the journal's: it keeps a document
    // missing the field from colliding with another one that is also missing it.
    partialFilterExpression: { movieId: { $type: "string" } },
  }
);

// One per state, serving "this member's <state>, newest first".
UserMovieSchema.index({ userEmail: 1, "favorite.addedAt": -1, _id: -1 });
UserMovieSchema.index({ userEmail: 1, "watchlist.addedAt": -1, _id: -1 });
UserMovieSchema.index({ userEmail: 1, "watched.watchedAt": -1, _id: -1 });

export default mongoose.models?.UserMovie || mongoose.model("UserMovie", UserMovieSchema);
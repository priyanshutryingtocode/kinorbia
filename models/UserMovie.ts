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
      // Stamped at write time from the member's `shareActivity` flag, so the activity
      // feed never has to look up a followee's preference to decide visibility. Turning
      // the flag off clears it across the member's rows (updateShareActivity).
      broadcast: { type: Boolean, default: false },
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
// Serves the activity feed's watched branch: followees' broadcast titles, newest first.
// Partial, because broadcast rows are a small fraction of all rows and the index only
// carries the ones the feed can actually return.
//
// The query MUST include `watched.broadcast: true` explicitly for MongoDB to consider this
// index -- it is not enough that the rows happen to match. On the first page there is no
// cursor bound, so that predicate is the only thing keeping the planner off a collection
// scan. `explain()` on the full pipeline is what verifies it; see scripts/checkIndexes.mjs.
UserMovieSchema.index(
  { userEmail: 1, "watched.watchedAt": -1, _id: -1 },
  { partialFilterExpression: { "watched.broadcast": true } }
);

export default mongoose.models?.UserMovie || mongoose.model("UserMovie", UserMovieSchema);
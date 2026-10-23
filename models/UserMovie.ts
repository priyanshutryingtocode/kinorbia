import mongoose from "mongoose";
import { mediaTypeField } from "./shared";

const UserMovieSchema = new mongoose.Schema(
  {
    userEmail: { type: String, required: true },

    movieId: { type: String, required: true },

    mediaType: mediaTypeField,
    title: { type: String, required: true },
    posterPath: { type: String, default: null },
    voteAverage: { type: Number, default: 0 },
    releaseDate: { type: String, default: null },
    genreIds: { type: [Number], default: [] },

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
      broadcast: { type: Boolean, default: false },
      _id: false,
    },
  },
  { timestamps: true }
);

UserMovieSchema.index(
  { userEmail: 1, movieId: 1, mediaType: 1 },
  {
    unique: true,
    partialFilterExpression: { movieId: { $type: "string" } },
  }
);

UserMovieSchema.index({ userEmail: 1, "favorite.addedAt": -1, _id: -1 });
UserMovieSchema.index({ userEmail: 1, "watchlist.addedAt": -1, _id: -1 });
UserMovieSchema.index(
  { userEmail: 1, "watched.watchedAt": -1, _id: -1 },
  { partialFilterExpression: { "watched.broadcast": true } }
);

export default mongoose.models?.UserMovie || mongoose.model("UserMovie", UserMovieSchema);
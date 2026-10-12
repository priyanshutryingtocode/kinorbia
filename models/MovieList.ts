import mongoose from "mongoose";
import { authorFields, mediaRefFields, socialFields, visibilityField } from "./shared";

// `_id: false`: a list entry is a value inside the list, not a document of its own.
const ListMovieSchema = new mongoose.Schema({ ...mediaRefFields }, { _id: false });

const MovieListSchema = new mongoose.Schema({
  ...authorFields,
  title: {
    type: String,
    required: true,
    maxLength: 80,
  },
  description: {
    type: String,
    maxLength: 300,
  },
  movies: {
    type: [ListMovieSchema],
    default: [],
  },
  visibility: visibilityField,
  ...socialFields,
}, { timestamps: true });

MovieListSchema.index({ userEmail: 1 });
MovieListSchema.index({ visibility: 1 });
MovieListSchema.index({ "movies.movieId": 1, "movies.mediaType": 1, visibility: 1 });
// These exist on the server under names an older mongoose generated. Do not drop them:
// MongoDB will not recreate the same key under a second name (IndexOptionsConflict 85).
MovieListSchema.index({ visibility: 1, createdAt: -1, _id: -1 });
MovieListSchema.index({ userEmail: 1, createdAt: -1, _id: -1 });

export default mongoose.models?.MovieList || mongoose.model("MovieList", MovieListSchema);
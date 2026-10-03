import mongoose from "mongoose";

const ListMovieSchema = new mongoose.Schema({
  movieId: {
    type: String,
    required: true,
  },
  mediaType: {
    type: String,
    enum: ["movie", "tv"],
    default: "movie",
  },
  title: {
    type: String,
    required: true,
  },
  posterPath: {
    type: String,
  },
  voteAverage: {
    type: Number,
  },
  releaseDate: {
    type: String,
  },
}, { _id: false });

const MovieListSchema = new mongoose.Schema({
  userEmail: {
    type: String,
    required: true,
    index: true,
  },
  userName: {
    type: String,
    required: true,
  },
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
  visibility: {
    type: String,
    enum: ["public", "private"],
    default: "public",
    index: true,
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

MovieListSchema.index({ "movies.movieId": 1, "movies.mediaType": 1, visibility: 1 });

// As on Review: the lists index and a profile's own lists both filter on one
// field and sort by date, which the single-field indexes above cannot serve.
MovieListSchema.index({ visibility: 1, createdAt: -1, _id: -1 });
MovieListSchema.index({ userEmail: 1, createdAt: -1, _id: -1 });

export default mongoose.models?.MovieList || mongoose.model("MovieList", MovieListSchema);

import mongoose from "mongoose";

const ListMovieSchema = new mongoose.Schema({
  movieId: {
    type: String,
    required: true,
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
  personalRating: {
    type: Number,
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
}, { timestamps: true });

export default mongoose.models?.MovieList || mongoose.model("MovieList", MovieListSchema);

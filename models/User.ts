import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    select: false,
  },
  image: {
    type: String,
  },
  username: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
  },
  bio: {
    type: String,
    default: "",
    maxLength: 160,
  },
  provider: {
    type: String,
    default: "credentials",
  },
  emailVerified: {
    type: Date,
    default: null,
  },
  verifyToken: {
    token: String,
    expiresAt: Date,
    _id: false,
  },
  resetToken: {
    token: String,
    expiresAt: Date,
    _id: false,
  },
  favorites: [
    {
      movieId: { type: String, required: true },
      title: { type: String, required: true },
      posterPath: { type: String },
      voteAverage: { type: Number },
      releaseDate: { type: String },
      personalRating: { type: Number, default: 0 },
      addedAt: { type: Date, default: Date.now },
    },
  ],
  watchlist: [
    {
      movieId: { type: String, required: true },
      title: { type: String, required: true },
      posterPath: { type: String },
      voteAverage: { type: Number },
      releaseDate: { type: String },
      addedAt: { type: Date, default: Date.now },
    },
  ],
  savedReviewIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }],
  savedListIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "MovieList" }],
}, { timestamps: true });

export default mongoose.models?.User || mongoose.model("User", UserSchema);

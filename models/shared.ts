
export const mediaTypeField = {
  type: String,
  enum: ["movie", "tv"],
  default: "movie",
};

const posterFields = {
  posterPath: { type: String },
  mediaType: mediaTypeField,
};

export const mediaCoreFields = {
  movieId: { type: String },
  title: { type: String, required: true },
  ...posterFields,
};

export const mediaRefFields = {
  movieId: { type: String, required: true },
  title: { type: String, required: true },
  voteAverage: { type: Number },
  releaseDate: { type: String },
  ...posterFields,
};

export const authorFields = {
  userEmail: { type: String, required: true },
  userName: { type: String, required: true },
};

export const visibilityField = {
  type: String,
  enum: ["public", "private"],
  default: "public",
};

export const socialFields = {
  likedBy: { type: [String], default: [] },
  savedBy: { type: [String], default: [] },
};

export const tokenField = {
  token: String,
  expiresAt: Date,
  _id: false,
};
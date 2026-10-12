// Field definitions shared by the models, rather than schemas: plain objects, because
// callers disagree about whether an entry should carry an `_id` and a schema would force
// one answer on all of them.

// The id namespaces are separate per media type, so this is repeated rather than once.
export const mediaTypeField = {
  type: String,
  enum: ["movie", "tv"],
  default: "movie",
};

const posterFields = {
  posterPath: { type: String },
  mediaType: mediaTypeField,
};

// `movieId` is optional: the unique index is partial on it being a string.
export const mediaCoreFields = {
  movieId: { type: String },
  title: { type: String, required: true },
  ...posterFields,
};

// A list entry: a reference plus TMDB's rating and release date, so a row renders with no
// second lookup. Not shared with UserMovie, which also stores genreIds -- adding it here
// would put an empty array on every list entry.
export const mediaRefFields = {
  movieId: { type: String, required: true },
  title: { type: String, required: true },
  voteAverage: { type: Number },
  releaseDate: { type: String },
  ...posterFields,
};

// Denormalised so a feed renders with no join. The index is declared per model, not here:
  // an index cannot be shared between collections, and mongoose rejects an `index` key
  // inside a spread of a sub-schema array.
export const authorFields = {
  userEmail: { type: String, required: true },
  userName: { type: String, required: true },
};

// Private by default. Keyed, never spread: spreading drops `type`/`enum`/`default` onto
// the schema root and Mongoose throws reading `default: "public"` as a path type.
// The plural names below are maps and are spread; this and `tokenField` are keyed.
//
// Two Mongoose traps, stated once because neither error names its cause: `findOne`'s 2nd arg
  // is a projection, not options, so `{ session }` there throws "ClientSession cannot be
  // serialized to BSON" (use `.session()`); and `Model.exists` takes no options at all.
export const visibilityField = {
  type: String,
  enum: ["public", "private"],
  default: "public",
};

// Email-keyed: the lowercased email is the only reliable join across these documents.
export const socialFields = {
  likedBy: { type: [String], default: [] },
  savedBy: { type: [String], default: [] },
};

// Single-use with its own expiry. `_id: false`: the token is the address.
export const tokenField = {
  token: String,
  expiresAt: Date,
  _id: false,
};
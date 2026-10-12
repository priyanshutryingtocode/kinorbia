import "server-only";

import dbConnect from "@/lib/dbConnect";
import { MAX_FAVORITES, MAX_WATCHLIST } from "@/lib/bounds";
import { emailCandidates, emailMatch } from "@/lib/emailMatch";
import User from "@/models/User";
import UserMovie from "@/models/UserMovie";
import mongoose, { type ClientSession } from "mongoose";
import type { MediaType } from "@/types";

// Canonical operations on a member's relationship to one title: favorited, watchlisted,
// watched. Unsetting a state removes just that sub-document, so un-favouriting a watched
// title keeps the watched state.

type MediaSnapshot = {
  movieId: string;
  mediaType: MediaType;
  title: string;
  posterPath?: string | null;
  voteAverage?: number | null;
  releaseDate?: string | null;
  genreIds?: number[];
};

type FavoriteWrite = MediaSnapshot & {
  addedAt?: Date;
  personalRating?: number;
};

// Runs `work` in a transaction unless the caller supplied a session: MongoDB has no nested
// transactions, so a caller that opened one owns the commit. Claiming the counter and writing
// the row then roll back together -- a stranded claim would refuse every later add.
async function inTransaction<T>(
  session: ClientSession | undefined,
  work: (session: ClientSession | undefined) => Promise<T>
): Promise<T> {
  if (session) {
    return work(session);
  }

  const own = await mongoose.startSession();
  try {
    let result: T | undefined;
    await own.withTransaction(async () => {
      result = await work(own);
    });
    return result as T;
  } finally {
    await own.endSession();
  }
}

// The row key every write uses. Auth already lowercases, but normalizing here keeps the
// write paths agreeing with the read paths regardless.
function normalizedEmail(userEmail: string) {
  return emailCandidates([userEmail])[0] ?? userEmail;
}

// `title` is required on the schema and providedFields skips a falsy one, so an upsert only
// ever gets it from $set -- which MongoDB applies on insert too. requireTitle runs on every
// write before its counter claim, so an insert cannot fail validation with the claim taken.
function requireTitle(snapshot: MediaSnapshot) {
  if (!snapshot.title) {
    throw new Error(`Cannot store a media row without a title (${snapshot.mediaType}:${snapshot.movieId})`);
  }
}

// Only writes fields the caller supplied: overwriting genreIds with [] would erase a
// favorite that predates the column.
function providedFields(snapshot: MediaSnapshot) {
  const fields: Record<string, unknown> = {};

  if (snapshot.title) fields.title = snapshot.title;
  if (snapshot.posterPath !== undefined) fields.posterPath = snapshot.posterPath ?? null;
  if (snapshot.voteAverage !== undefined && snapshot.voteAverage !== null) {
    fields.voteAverage = snapshot.voteAverage;
  }
  if (snapshot.releaseDate !== undefined && snapshot.releaseDate !== null) {
    fields.releaseDate = snapshot.releaseDate;
  }
  if (snapshot.genreIds && snapshot.genreIds.length > 0) fields.genreIds = snapshot.genreIds;

  return fields;
}



// False means the member is at the cap and nothing was written. The claim is a conditional
// `$inc`, so the cap test and the increment are one atomic operation.
export async function addFavorite(
  userEmail: string,
  write: FavoriteWrite,
  { session }: { session?: ClientSession } = {}
): Promise<boolean> {
  await dbConnect();

  const email = normalizedEmail(userEmail);
  requireTitle(write);

  return inTransaction(session, async (tx) => {
    const existing = await UserMovie.findOne(
      { userEmail: email, movieId: write.movieId, mediaType: write.mediaType },
      { favorite: 1 }
    )
      .session(tx ?? null)
      .lean<{ favorite?: { addedAt?: Date } } | null>();
    const alreadyFavorited = Boolean(existing?.favorite?.addedAt);

    // Only a genuinely new favorite takes a slot; re-rating must not be charged to the cap.
    if (!alreadyFavorited && !(await claimSlot(email, "favorite", tx))) {
      return false;
    }

    // `$min` not `$set`: the favorite date is first-write-wins, and every favorites view
    // sorts by it, so restamping would reorder the list on a rating change alone.
    await UserMovie.updateOne(
      { userEmail: email, movieId: write.movieId, mediaType: write.mediaType },
      {
        $min: { "favorite.addedAt": write.addedAt ?? new Date() },
        $set: {
          ...providedFields(write),
          ...(write.personalRating !== undefined
            ? { "favorite.personalRating": write.personalRating }
            : {}),
        },
        $setOnInsert: { userEmail: email, movieId: write.movieId, mediaType: write.mediaType },
      },
      { upsert: true, ...(tx ? { session: tx } : {}) }
    );

    return true;
  });
}

async function removeFavorite(
  userEmail: string,
  ref: { movieId: string; mediaType: MediaType },
  { session }: { session?: ClientSession } = {}
): Promise<void> {
  await dbConnect();

  const email = normalizedEmail(userEmail);

  await inTransaction(session, async (tx) => {
    // Read before the unset: afterwards there is nothing left to say whether a slot is owed.
    const wasFavorited = await wasFavorite(email, ref, tx);

    await UserMovie.updateOne(
      { userEmail: email, movieId: ref.movieId, mediaType: ref.mediaType },
      { $unset: { favorite: "" } },
      tx ? { session: tx } : {}
    );

    if (wasFavorited) {
      await releaseSlot(email, "favorite", tx);
    }
  });
}

async function wasFavorite(
  email: string,
  ref: { movieId: string; mediaType: MediaType },
  session?: ClientSession
): Promise<boolean> {
  const row = await UserMovie.findOne(
    { userEmail: email, movieId: ref.movieId, mediaType: ref.mediaType },
    { favorite: 1 }
  )
  .session(session ?? null)
  .lean<{ favorite?: { addedAt?: Date } } | null>();

  return Boolean(row?.favorite?.addedAt);
}

// `false` means the member is at the limit and the caller must not write.
async function claimSlot(
  email: string,
  state: "favorite" | "watchlist",
  session?: ClientSession
): Promise<boolean> {
  const counter = state === "favorite" ? "favoritesCount" : "watchlistCount";
  const max = state === "favorite" ? MAX_FAVORITES : MAX_WATCHLIST;

  // `$lt` does not match an absent field, so a missing counter must be asked for
  // explicitly or every pre-backfill member reads as full.
  const claimed = await User.updateOne(
    {
      email,
      $or: [{ [counter]: { $lt: max } }, { [counter]: { $exists: false } }],
    },
    { $inc: { [counter]: 1 } },
    session ? { session } : {}
  );

  return claimed.modifiedCount > 0;
}

async function releaseSlot(
  email: string,
  state: "favorite" | "watchlist",
  session?: ClientSession
): Promise<void> {
  const counter = state === "favorite" ? "favoritesCount" : "watchlistCount";

  // Guarded so a double release cannot drive the counter negative and hand out free slots.
  await User.updateOne(
    { email, [counter]: { $gt: 0 } },
    { $inc: { [counter]: -1 } },
    session ? { session } : {}
  );
}

async function addWatchlist(
  userEmail: string,
  write: MediaSnapshot & { addedAt?: Date },
  { session }: { session?: ClientSession } = {}
): Promise<boolean> {
  await dbConnect();

const email = normalizedEmail(userEmail);
  requireTitle(write);

  return inTransaction(session, async (tx) => {
    const existing = await UserMovie.findOne(
      { userEmail: email, movieId: write.movieId, mediaType: write.mediaType },
      { watchlist: 1 }
    )
      .session(tx ?? null)
      .lean<{ watchlist?: { addedAt?: Date } } | null>();

    if (!existing?.watchlist?.addedAt && !(await claimSlot(email, "watchlist", tx))) {
      return false;
    }

    // `$min` not `$set`: first-write-wins, or re-adding jumps the title to the top.
    await UserMovie.updateOne(
      { userEmail: email, movieId: write.movieId, mediaType: write.mediaType },
      {
        $min: { "watchlist.addedAt": write.addedAt ?? new Date() },
        $set: providedFields(write),
        $setOnInsert: { userEmail: email, movieId: write.movieId, mediaType: write.mediaType },
      },
      { upsert: true, ...(tx ? { session: tx } : {}) }
    );

    return true;
  });
}

async function removeWatchlist(
  userEmail: string,
  ref: { movieId: string; mediaType: MediaType },
  { session }: { session?: ClientSession } = {}
): Promise<void> {
  await dbConnect();

  const email = normalizedEmail(userEmail);

  await inTransaction(session, async (tx) => {
    const existing = await UserMovie.findOne(
      { userEmail: email, movieId: ref.movieId, mediaType: ref.mediaType },
      { watchlist: 1 }
    )
      .session(tx ?? null)
      .lean<{ watchlist?: { addedAt?: Date } } | null>();

    await UserMovie.updateOne(
      { userEmail: email, movieId: ref.movieId, mediaType: ref.mediaType },
      { $unset: { watchlist: "" } },
      tx ? { session: tx } : {}
    );

    if (existing?.watchlist?.addedAt) {
      await releaseSlot(email, "watchlist", tx);
    }
  });
}

// Shared by the favorites and watchlist routes: add the title if absent, remove if present.
export async function toggleMedia(
  {
    email,
    state,
    snapshot,
  }: {
    email: string;
    state: "favorite" | "watchlist";
    snapshot: MediaSnapshot;
  },
  { session }: { session?: ClientSession } = {}
): Promise<"added" | "removed" | "full" | "missing"> {
  await dbConnect();

  // Normalized here too: the read below must match the key the helpers write under.
  const key = normalizedEmail(email);
  const ref = { movieId: snapshot.movieId, mediaType: snapshot.mediaType };
  const existing = await UserMovie.findOne({ userEmail: key, ...ref }, { favorite: 1, watchlist: 1 })
    .session(session ?? null)
    .lean<{ favorite?: { addedAt?: Date }; watchlist?: { addedAt?: Date } } | null>();

  const present = state === "favorite" ? existing?.favorite?.addedAt : existing?.watchlist?.addedAt;

  if (!present) {
    const options = session ? { session } : {};
    const added =
      state === "favorite"
        ? await addFavorite(key, snapshot, options)
        : await addWatchlist(key, snapshot, options);
    if (added) {
      return "added";
    }
    // Refused for the cap; fall through so a missing account still reports 404.
  } else if (state === "favorite") {
    await removeFavorite(key, ref, session ? { session } : {});
    return "removed";
  } else {
    await removeWatchlist(key, ref, session ? { session } : {});
    return "removed";
  }

  // Model.exists() takes no options, so a session-aware check has to be a countDocuments.
  // Matched case-insensitively: the session email and the stored one can differ in case.
  const known = await User.countDocuments(
    { email: emailMatch(email) },
    session ? { session } : {}
  );

  return known ? "full" : "missing";
}

export async function markWatched(
  userEmail: string,
  write: MediaSnapshot & { watchedAt?: Date },
  { session }: { session?: ClientSession } = {}
): Promise<void> {
  await dbConnect();

  requireTitle(write);

  const watchedAt = write.watchedAt ?? new Date();

  // `$min` not `$set`: first-write-wins, or re-marking moves the date the streaks are
  // built from. `$setOnInsert` cannot carry it alone -- a title can already exist as a
  // favorite and be watched for the first time, with no insert to ride on.
  await UserMovie.updateOne(
    { userEmail, movieId: write.movieId, mediaType: write.mediaType },
    {
      $min: { "watched.watchedAt": watchedAt },
      $set: providedFields(write),
      $setOnInsert: { userEmail, movieId: write.movieId, mediaType: write.mediaType },
    },
    { upsert: true, ...(session ? { session } : {}) }
  );
}

type MemberMediaStatus = {
  isFavorite: boolean;
  personalRating: number;
  isWatchlisted: boolean;
  isWatched: boolean;
};

const EMPTY_STATUS: MemberMediaStatus = {
  isFavorite: false,
  personalRating: 0,
  isWatchlisted: false,
  isWatched: false,
};

export async function getMediaStatus(
  userEmail: string,
  ref: { movieId: string; mediaType: MediaType },
  { session }: { session?: ClientSession } = {}
): Promise<MemberMediaStatus> {
  if (!userEmail) {
    return EMPTY_STATUS;
  }

  await dbConnect();

  const row = await UserMovie.findOne({
    userEmail,
    movieId: ref.movieId,
    mediaType: ref.mediaType,
  })
    .select("favorite watchlist watched")
    .session(session ?? null)
    .lean<{
      favorite?: { addedAt?: Date; personalRating?: number };
      watchlist?: { addedAt?: Date };
      watched?: { watchedAt?: Date };
    } | null>();

  if (!row) {
    return EMPTY_STATUS;
  }

  return {
    isFavorite: Boolean(row.favorite?.addedAt),
    personalRating: row.favorite?.personalRating || 0,
    isWatchlisted: Boolean(row.watchlist?.addedAt),
    isWatched: Boolean(row.watched?.watchedAt),
  };
}
// --- reads ---------------------------------------------------------------------

type MediaState = "favorite" | "watchlist" | "watched" | "rated";

export type MediaRow = {
  movieId: string;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  voteAverage: number;
  releaseDate: string | null;
  genreIds: number[];
  personalRating: number;
  addedAt: Date | null;
};

// listUserMedia("watched") already resolves addedAt to watchedAt, so this only reshapes.
export type WatchedRow = {
  movieId: string;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  watchedAt: Date;
};

type ListOptions = {
  mediaType?: MediaType;
  skip?: number;
  limit?: number;
  session?: ClientSession;
};

const ROW_PROJECTION =
  "movieId mediaType title posterPath voteAverage releaseDate genreIds favorite.personalRating favorite.addedAt watchlist.addedAt watched.watchedAt";

function stateFilter(state: MediaState, mediaType?: MediaType) {
  const filter: Record<string, unknown> = {};

  if (state === "favorite") filter["favorite.addedAt"] = { $ne: null };
  if (state === "watchlist") filter["watchlist.addedAt"] = { $ne: null };
  if (state === "watched") filter["watched.watchedAt"] = { $ne: null };
  if (state === "rated") filter["favorite.personalRating"] = { $gt: 0 };
  if (mediaType) filter.mediaType = mediaType;

  return filter;
}

// Newest first for whichever state was fetched; `_id` decides rows sharing an addedAt.
function stateSort(state: MediaState) {
  const path =
    state === "watchlist" ? "watchlist.addedAt" : state === "watched" ? "watched.watchedAt" : "favorite.addedAt";
  return { [path]: -1 as const, _id: -1 as const };
}

// addedAt is the date of the state fetched FOR: a title on both lists has two real dates,
// and reporting the wrong one labels the grid with a date it was not ordered by.
function toMediaRow(row: Record<string, unknown>, state: MediaState): MediaRow {
  const favorite = (row.favorite ?? {}) as { addedAt?: Date; personalRating?: number };
  const watchlist = (row.watchlist ?? {}) as { addedAt?: Date };
  const watched = (row.watched ?? {}) as { watchedAt?: Date };

  return {
    movieId: row.movieId as string,
    mediaType: row.mediaType as MediaType,
    title: row.title as string,
    posterPath: (row.posterPath ?? null) as string | null,
    voteAverage: (row.voteAverage ?? 0) as number,
    releaseDate: (row.releaseDate ?? null) as string | null,
    genreIds: (row.genreIds ?? []) as number[],
    personalRating: favorite.personalRating ?? 0,
    addedAt:
      state === "watchlist"
        ? watchlist.addedAt ?? null
        : state === "watched"
          ? watched.watchedAt ?? null
          : favorite.addedAt ?? null,
  };
}

export async function listUserMedia(
  email: string,
  state: MediaState,
  { mediaType, skip = 0, limit = 0, session }: ListOptions = {}
): Promise<{ rows: MediaRow[]; total: number }> {
  await dbConnect();
  const filter = { userEmail: email, ...stateFilter(state, mediaType) };

  const [rows, total] = await Promise.all([
    UserMovie.find(filter)
      .select(ROW_PROJECTION)
      .sort(stateSort(state))
      .skip(skip)
      .limit(limit)
      .session(session ?? null)
      .lean<Record<string, unknown>[]>(),
    UserMovie.countDocuments(filter, session ? { session } : {}),
  ]);

  return { rows: rows.map((row) => toMediaRow(row, state)), total };
}

export async function listWatchHistory(
  email: string,
  { limit = 0, session }: Pick<ListOptions, "limit" | "session"> = {}
): Promise<WatchedRow[]> {
  const { rows } = await listUserMedia(email, "watched", { limit, session });

  return rows.map((row) => ({
    movieId: row.movieId,
    mediaType: row.mediaType,
    title: row.title,
    posterPath: row.posterPath,
    watchedAt: row.addedAt as Date,
  }));
}

// Distinct watch timestamps, which is what a streak is built from.
export async function listWatchDays(email: string, session?: ClientSession): Promise<Date[]> {
  await dbConnect();

  return UserMovie.distinct(
    "watched.watchedAt",
    { userEmail: email, "watched.watchedAt": { $ne: null } },
    session ? { session } : {}
  );
}

export async function getUserMediaByKey(
  email: string,
  mediaKey: string,
  { session }: { session?: ClientSession } = {}
): Promise<MediaRow | null> {
  const separator = mediaKey.indexOf(":");
  if (separator < 1) {
    return null;
  }

  await dbConnect();

  const row = await UserMovie.findOne({
    userEmail: email,
    movieId: mediaKey.slice(separator + 1),
    mediaType: mediaKey.slice(0, separator) === "tv" ? "tv" : "movie",
  })
    .select(ROW_PROJECTION)
    .session(session ?? null)
    .lean<Record<string, unknown> | null>();

  // No state asked for, so report the favorite date: only a favorite carries a rating.
  return row ? toMediaRow(row, "favorite") : null;
}

export async function ratingMapsForUsers(
  emails: string[],
  { session }: { session?: ClientSession } = {}
): Promise<Map<string, Map<string, number>>> {
  await dbConnect();

  const maps = new Map<string, Map<string, number>>();
  if (emails.length === 0) {
    return maps;
  }

  const rows = await UserMovie.find({
    userEmail: { $in: emails },
    "favorite.personalRating": { $gt: 0 },
  })
    .select("userEmail movieId mediaType favorite.personalRating")
    .session(session ?? null)
    .lean<
      { userEmail: string; movieId: string; mediaType: string; favorite?: { personalRating?: number } }[]
    >();

  for (const row of rows) {
    const rating = row.favorite?.personalRating || 0;
    if (rating <= 0) {
      continue;
    }
    let byKey = maps.get(row.userEmail);
    if (!byKey) {
      byKey = new Map<string, number>();
      maps.set(row.userEmail, byKey);
    }
    byKey.set(`${row.mediaType === "tv" ? "tv" : "movie"}:${row.movieId}`, rating);
  }

  return maps;
}

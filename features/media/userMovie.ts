import "server-only";

import { mediaKey, normalizeMediaType } from "@/lib/media";
import dbConnect from "@/lib/dbConnect";
import { MAX_FAVORITES, MAX_WATCHLIST } from "@/lib/bounds";
import { emailCandidates, emailMatch } from "@/lib/emailMatch";
import User from "@/models/User";
import UserMovie from "@/models/UserMovie";
import mongoose, { type ClientSession } from "mongoose";
import type { MediaType } from "@/types";


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

function normalizedEmail(userEmail: string) {
  return emailCandidates([userEmail])[0] ?? userEmail;
}

function requireTitle(snapshot: MediaSnapshot) {
  if (!snapshot.title) {
    throw new Error(`Cannot store a media row without a title (${snapshot.mediaType}:${snapshot.movieId})`);
  }
}

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

    if (!alreadyFavorited && !(await claimSlot(email, "favorite", tx))) {
      return false;
    }
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

async function claimSlot(
  email: string,
  state: "favorite" | "watchlist",
  session?: ClientSession
): Promise<boolean> {
  const counter = state === "favorite" ? "favoritesCount" : "watchlistCount";
  const max = state === "favorite" ? MAX_FAVORITES : MAX_WATCHLIST;

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

  } else if (state === "favorite") {
    await removeFavorite(key, ref, session ? { session } : {});
    return "removed";
  } else {
    await removeWatchlist(key, ref, session ? { session } : {});
    return "removed";
  }

  const known = await User.countDocuments(
    { email: emailMatch(email) },
    session ? { session } : {}
  );

  return known ? "full" : "missing";
}

export async function markWatched(
    userEmail: string,
    write: MediaSnapshot,
    { session }: { session?: ClientSession } = {}
  ): Promise<void> {
    await dbConnect();

    requireTitle(write);

  const watchedAt = new Date();
    const member = await User.findOne({ email: userEmail })
      .select("shareActivity")
      .session(session ?? null)
      .lean<{ shareActivity?: boolean } | null>();
    const broadcast = Boolean(member?.shareActivity);

  await UserMovie.updateOne(
    { userEmail, movieId: write.movieId, mediaType: write.mediaType },
{
$min: { "watched.watchedAt": watchedAt },
        $set: { ...providedFields(write), "watched.broadcast": broadcast },
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

export type MediaState = "favorite" | "watchlist" | "watched" | "rated";

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
  broadcast: boolean;
};


export type WatchedRow = {
  movieId: string;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  watchedAt: Date;
  voteAverage: number;
  releaseDate: string | null;
  genreIds: number[];
  personalRating: number;
  broadcast: boolean;
};

export type LibrarySort = "recent" | "rating" | "title" | "year";

export type LibraryFacets = {
  genre?: number;
  minRating?: number;
  year?: number;
  sort?: LibrarySort;
};

type ListOptions = {
  mediaType?: MediaType;
  skip?: number;
  limit?: number;
  session?: ClientSession;
  facets?: LibraryFacets;
};

const ROW_PROJECTION =
  "movieId mediaType title posterPath voteAverage releaseDate genreIds favorite.personalRating favorite.addedAt watchlist.addedAt watched.watchedAt watched.broadcast";

function stateFilter(state: MediaState, mediaType?: MediaType) {
  const filter: Record<string, unknown> = {};

  if (state === "favorite") filter["favorite.addedAt"] = { $ne: null };
  if (state === "watchlist") filter["watchlist.addedAt"] = { $ne: null };
  if (state === "watched") filter["watched.watchedAt"] = { $ne: null };
  if (state === "rated") filter["favorite.personalRating"] = { $gt: 0 };
  if (mediaType) filter.mediaType = mediaType;

  return filter;
}

function facetFilter(facets?: LibraryFacets) {
  const filter: Record<string, unknown> = {};
  if (!facets) return filter;

  if (facets.genre !== undefined) filter.genreIds = facets.genre;

  if (facets.minRating !== undefined) {
    filter["favorite.personalRating"] = { $gte: facets.minRating, $gt: 0 };
  }

  if (facets.year !== undefined) {
    filter.releaseDate = {
      $gte: `${facets.year}-01-01`,
      $lt: `${facets.year + 1}-01-01`,
    };
  }

  return filter;
}

function stateSort(state: MediaState) {
  const path =
    state === "watchlist" ? "watchlist.addedAt" : state === "watched" ? "watched.watchedAt" : "favorite.addedAt";
  return { [path]: -1 as const, _id: -1 as const };
}

function facetSort(state: MediaState, sort?: LibrarySort) {
  if (sort === "rating") return { "favorite.personalRating": -1 as const, _id: -1 as const };
  if (sort === "title") return { title: 1 as const, _id: 1 as const };
  if (sort === "year") return { releaseDate: -1 as const, _id: -1 as const };
  return stateSort(state);
}

function toMediaRow(row: Record<string, unknown>, state: MediaState): MediaRow {
  const favorite = (row.favorite ?? {}) as { addedAt?: Date; personalRating?: number };
  const watchlist = (row.watchlist ?? {}) as { addedAt?: Date };
  const watched = (row.watched ?? {}) as { watchedAt?: Date; broadcast?: boolean };

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
    broadcast: Boolean(watched.broadcast),
  };
}

export async function listUserMedia(
  email: string,
  state: MediaState,
  { mediaType, skip = 0, limit = 0, session, facets }: ListOptions = {}
): Promise<{ rows: MediaRow[]; total: number }> {
  const filter = {
    userEmail: email,
    ...stateFilter(state, mediaType),
    ...facetFilter(facets),
  };

  const [rows, total] = await Promise.all([
    UserMovie.find(filter)
      .select(ROW_PROJECTION)
      .sort(facetSort(state, facets?.sort))
      .skip(skip)
      .limit(limit)
      .session(session ?? null)
      .lean<Record<string, unknown>[]>(),
    UserMovie.countDocuments(filter, session ? { session } : {}),
  ]);

  return { rows: rows.map((row) => toMediaRow(row, state)), total };
}

export async function listUserMediaRows(
  email: string,
  state: MediaState,
  { mediaType, skip = 0, limit = 0, session, facets }: ListOptions = {}
): Promise<MediaRow[]> {
  await dbConnect();
  const filter = {
    userEmail: email,
    ...stateFilter(state, mediaType),
    ...facetFilter(facets),
  };

  const rows = await UserMovie.find(filter)
    .select(ROW_PROJECTION)
    .sort(facetSort(state, facets?.sort))
    .skip(skip)
    .limit(limit)
    .session(session ?? null)
    .lean<Record<string, unknown>[]>();

  return rows.map((row) => toMediaRow(row, state));
}

export async function listWatchHistory(
  email: string,
  { limit = 0, session }: Pick<ListOptions, "limit" | "session"> = {}
): Promise<WatchedRow[]> {
  const rows = await listUserMediaRows(email, "watched", { limit, session });

  return rows.map((row) => ({
    movieId: row.movieId,
    mediaType: row.mediaType,
    title: row.title,
    posterPath: row.posterPath,
    watchedAt: row.addedAt as Date,
    voteAverage: row.voteAverage,
    releaseDate: row.releaseDate,
    genreIds: row.genreIds,
    personalRating: row.personalRating,
    broadcast: row.broadcast,
  }));
}

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
    mediaType: normalizeMediaType(mediaKey.slice(0, separator)),
  })
    .select(ROW_PROJECTION)
    .session(session ?? null)
    .lean<Record<string, unknown> | null>();

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
    byKey.set(mediaKey(row.mediaType, row.movieId), rating);
  }

  return maps;
}

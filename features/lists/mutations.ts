import "server-only";

import dbConnect from "@/lib/dbConnect";
import { MAX_LIST_MOVIES } from "@/lib/bounds";
import { mediaKey } from "@/lib/media";
import { toFavoriteMovie } from "@/lib/reviewRatings";
import { listUserMediaRows } from "@/features/media/userMovie";
import Comment from "@/models/Comment";
import MovieList from "@/models/MovieList";
import Notification from "@/models/Notification";
import type { ClientSession } from "mongoose";
import type { ListMovie } from "@/types";
import { logger } from "@/lib/logger";

type MutationOptions = { session?: ClientSession };

async function loadFavoritesForList(email: string, { session }: MutationOptions = {}) {
  return listUserMediaRows(email, "favorite", { session });
}

// Reads only the six fields it copies, so it accepts the projected shape the callers
// pass in rather than requiring a whole FavoriteMovie.
type ListOutcome = "ok" | "not-found" | "too-many" | "failed";

export async function createList(
  input: {
    authorEmail: string;
    authorName: string;
    title: string;
    description: string;
    visibility: "public" | "private";
    selectedKeys: Set<string>;
  },
  { session }: MutationOptions = {}
): Promise<ListOutcome> {
  await dbConnect();

  const favorites = await loadFavoritesForList(input.authorEmail, { session });
  const selectedMovies = favorites
    .filter((movie) => input.selectedKeys.has(mediaKey(movie.mediaType, movie.movieId)))
    .map(toFavoriteMovie);

  if (selectedMovies.length > MAX_LIST_MOVIES) {
    return "too-many";
  }

  try {
    await MovieList.create(
      [
        {
          userEmail: input.authorEmail,
          userName: input.authorName,
          title: input.title,
          description: input.description,
          movies: selectedMovies,
          visibility: input.visibility,
        },
      ],
      session ? { session } : {}
    );
  } catch (error) {
    logger.error("Error creating list:", { error });
    return "failed";
  }

  return "ok";
}

export async function updateList(
  input: {
    authorEmail: string;
    listId: string;
    title: string;
    description: string;
    visibility: "public" | "private";
    selectedKeys: Set<string>;
  },
  { session }: MutationOptions = {}
): Promise<ListOutcome> {
  await dbConnect();
  const opts = session ? { session } : {};

  const [favorites, existing] = await Promise.all([
    loadFavoritesForList(input.authorEmail, { session }),
    MovieList.findOne({ _id: input.listId, userEmail: input.authorEmail })
      .select("movies")
      .session(session ?? null)
      .lean<{ movies?: ListMovie[] } | null>(),
  ]);

  if (!existing) {
    return "not-found";
  }

  const favoriteByKey = new Map(
    favorites.map((movie) => [mediaKey(movie.mediaType, movie.movieId), movie])
  );

  // The picker submits a membership set, not a sequence, so the stored order is the only order
  // a list has. Rebuilding it from `favorites` reshuffled every list on every save -- even a
  // typo fix -- so walk `existing.movies` and take each entry's data from the current favorite.
  const mergedMovies: ListMovie[] = [];
  const mergedKeys = new Set<string>();

  for (const movie of existing.movies || []) {
    const key = mediaKey(movie.mediaType, movie.movieId);
    if (mergedKeys.has(key)) {
      continue;
    }
    const favorite = favoriteByKey.get(key);
    if (favorite) {
      // A favorite the member unticked leaves the list.
      if (!input.selectedKeys.has(key)) {
        continue;
      }
      mergedMovies.push(toFavoriteMovie(favorite));
    } else {
      // Not in favorites, so the picker could not have offered it. Keep it.
      mergedMovies.push(movie);
    }
    mergedKeys.add(key);
  }

  for (const movie of favorites) {
    const key = mediaKey(movie.mediaType, movie.movieId);
    if (input.selectedKeys.has(key) && !mergedKeys.has(key)) {
      mergedMovies.push(toFavoriteMovie(movie));
      mergedKeys.add(key);
    }
  }

  if (mergedMovies.length > MAX_LIST_MOVIES) {
    return "too-many";
  }

  const result = await MovieList.updateOne(
    { _id: input.listId, userEmail: input.authorEmail },
    { $set: { title: input.title, description: input.description, visibility: input.visibility, movies: mergedMovies } },
    opts
  );

  return result.matchedCount === 1 ? "ok" : "not-found";
}

// Deletes a list, then everything that hangs off it. The cleanup is best-effort by
// design: a list whose comments or notifications survive is untidy, whereas failing
// the delete because the tidy-up errored leaves a member unable to remove their work.
export async function removeList(
  input: { authorEmail: string; listId: string },
  { session }: MutationOptions = {}
): Promise<ListOutcome> {
  await dbConnect();
  const opts = session ? { session } : {};

  const result = await MovieList.deleteOne(
    { _id: input.listId, userEmail: input.authorEmail },
    opts
  );

  if (result.deletedCount !== 1) {
    return "not-found";
  }

  try {
    await Promise.all([
      Comment.deleteMany({ parentType: "list", parentId: input.listId }, opts),
      Notification.deleteMany({ targetType: "list", targetId: input.listId }, opts),
    ]);
  } catch (error) {
    logger.error("Error cleaning up deleted list data:", { error: error });
  }

  return "ok";
}
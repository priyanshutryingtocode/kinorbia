import "server-only";

import dbConnect from "@/lib/dbConnect";
import { publiclyVisible } from "@/lib/visibility";
import { mediaEquals } from "@/lib/media";
import { getMediaStatus, listUserMediaRows, type MediaRow } from "@/features/media/userMovie";
import { buildReviewerMaps } from "@/lib/reviewRatings";
import MovieList from "@/models/MovieList";
import Review from "@/models/Review";
import type { MediaType } from "@/types";

const PREVIEW_LIMIT = 4;

type MediaReview = {
  _id: { toString: () => string };
  userName: string;
  userEmail: string;
  movieId?: string;
  mediaType?: MediaType;
  body: string;
  spoiler?: boolean;
};

type MediaList = {
  _id: { toString: () => string };
  userName: string;
  userEmail: string;
  title: string;
  description?: string;
  movies: { movieId: string; title: string; posterPath?: string | null }[];
};

type MediaCommunity = {
  reviews: MediaReview[];
  lists: MediaList[];
  usernames: Map<string, string>;
  ratingMaps: Map<string, Map<string, number>>;
};

// The two panels a movie detail page shows under the fold. Returns null when there
// is nothing public to show, which the caller renders as "render no section at all"
// rather than an empty one.
export async function getMediaCommunity({
  movieId,
  mediaType,
}: {
  movieId: string;
  mediaType: MediaType;
}): Promise<MediaCommunity | null> {
  await dbConnect();

  const [reviews, lists] = await Promise.all([
    Review.find({ movieId, mediaType: mediaEquals(mediaType), ...publiclyVisible() })
      .select("_id userEmail userName movieId mediaType body spoiler")
      .sort({ createdAt: -1 })
      .limit(PREVIEW_LIMIT)
      .lean<MediaReview[]>(),
    MovieList.find({
      "movies.movieId": movieId,
      "movies.mediaType": mediaEquals(mediaType),
      ...publiclyVisible(),
    })
      .select("_id userEmail userName title description movies.movieId movies.title movies.posterPath")
      .sort({ createdAt: -1 })
      .limit(PREVIEW_LIMIT)
      .lean<MediaList[]>(),
  ]);

  if (reviews.length === 0 && lists.length === 0) {
    return null;
  }

  const { ratingMaps, usernames } = await buildReviewerMaps([
    ...reviews.map((review) => review.userEmail),
    ...lists.map((list) => list.userEmail),
  ]);

  return { reviews, lists, usernames, ratingMaps };
}

export type PersonalMediaStatus = {
  isFavorite: boolean;
  personalRating: number;
  isWatchlisted: boolean;
  isWatched: boolean;
};

// Reads the member's relationship to one title from the normalised collection.
//
// This used to read the User document's two embedded arrays plus a second query against
// the journal: three reads, with a fallback folding a legacy null `mediaType` in with
// "movie". One row now answers all four questions.
export async function getPersonalMediaStatus(
  email: string | null | undefined,
  id: string,
  mediaType: MediaType
): Promise<PersonalMediaStatus> {
  return getMediaStatus(email ?? "", { movieId: id, mediaType });
}

// The member's most recently added favorite of one media type. Filtering before taking
// one, not after: a fixed-width window would hide a single old show behind 100 movies.
export async function getLatestFavoriteOfType(
  email: string,
  mediaType: MediaType
): Promise<MediaRow | null> {
  const rows = await listUserMediaRows(email, "favorite", { mediaType, limit: 1 });
  return rows[0] ?? null;
}

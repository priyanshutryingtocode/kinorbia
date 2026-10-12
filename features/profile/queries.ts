import "server-only";

import dbConnect from "@/lib/dbConnect";
import { escapeRegExp } from "@/lib/searchParams";
import { buildWatchStreaks } from "@/lib/insights";
import { pageBounds, paginate } from "@/lib/pagination";
import { mediaKey } from "@/lib/media";
import { publiclyVisible } from "@/lib/visibility";
import {
  listUserMedia,
  listWatchDays,
  listWatchHistory,
  type MediaRow,
  type WatchedRow,
} from "@/features/media/userMovie";
import { buildRatingMap, toFavoriteMovie, toWatchlistMovie } from "@/lib/reviewRatings";
import { PEOPLE_PAGE_SIZE, PROFILE_PAGE_SIZES } from "@/features/profile/constants";
import { serializeList, type RawMovieList } from "@/features/lists/serializers";
import { serializeReview, type RawReview } from "@/features/reviews/serializers";
import MovieList from "@/models/MovieList";
import Review from "@/models/Review";
import User from "@/models/User";
import UserMovie from "@/models/UserMovie";
import type { FavoriteMovie, JournalItem, MediaType, WatchlistMovie } from "@/types";

// ProfileIdentity plus this page's own favorite slice, composed so a field added to
// the identity cannot silently fail to reach the public profile.
type PublicProfileUser = ProfileIdentity;

type PublicReview = {
  _id: { toString: () => string };
  title: string;
  movieId?: string;
  mediaType?: MediaType;
  body: string;
  spoiler?: boolean;
  createdAt: Date;
};

type PublicList = {
  _id: { toString: () => string };
  title: string;
  description?: string;
  movieCount: number;
  createdAt: Date;
};

type PublicProfileData = {
  user: PublicProfileUser & { email: string };
  favorites: FavoriteMovie[];
  favoriteCount: number;
  ratingMap: Map<string, number>;
  publicReviewCount: number;
  publicListCount: number;
  reviews: PublicReview[];
  lists: PublicList[];
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
};

const PREVIEW_LIMIT = 6;

// Returns null when the username does not resolve, so the caller owns notFound().
export async function getPublicProfileData({
  username,
  currentEmail,
}: {
  username: string;
  currentEmail?: string;
}): Promise<PublicProfileData | null> {
  await dbConnect();

  const user = await User.findOne({ username })
    .select("_id name email bio image username createdAt following")
    .lean<PublicProfileUser | null>();

  if (!user?.email) {
    return null;
  }

  const targetEmail = user.email.toLowerCase();
  const isSelf = currentEmail === targetEmail;
  const followingEmails = [...new Set((user.following || []).map((email) => email.toLowerCase()))];

  const [
    publicReviewCount,
    publicListCount,
    reviews,
    lists,
    followerCount,
    followingCount,
    currentUser,
  ] = await Promise.all([
    Review.countDocuments({ userEmail: targetEmail, ...publiclyVisible() }),
    MovieList.countDocuments({ userEmail: targetEmail, ...publiclyVisible() }),
    Review.find({ userEmail: targetEmail, ...publiclyVisible() })
      .select("_id title movieId mediaType body spoiler createdAt")
      .sort({ createdAt: -1, _id: -1 })
      .limit(PREVIEW_LIMIT)
      .lean<PublicReview[]>(),
    MovieList.aggregate<PublicList>([
      { $match: { userEmail: targetEmail, ...publiclyVisible() } },
      { $sort: { createdAt: -1, _id: -1 } },
      { $limit: PREVIEW_LIMIT },
      {
        $project: {
          title: 1,
          description: 1,
          createdAt: 1,
          movieCount: { $size: { $ifNull: ["$movies", []] } },
        },
      },
    ]),
    User.countDocuments({ following: targetEmail }),
    followingEmails.length
      ? User.countDocuments({ email: { $in: followingEmails } })
      : Promise.resolve(0),
    isSelf || !currentEmail
      ? Promise.resolve(null)
      : User.findOne({ email: currentEmail }).select("following").lean<{ following?: string[] } | null>(),
  ]);

  // One query: the page compares the sliced length against the total, so a total from a
  // separate read could disagree with the rows beside it.
  const { rows: allFavorites, total: favoriteCount } = await listUserMedia(targetEmail, "favorite");

  return {
    user: { ...user, email: targetEmail },
    favorites: allFavorites.slice(0, PREVIEW_LIMIT).map(toFavoriteMovie),
    favoriteCount,
    ratingMap: buildRatingMap(allFavorites),
    publicReviewCount,
    publicListCount,
    reviews,
    lists,
    followerCount,
    followingCount,
    isFollowing: Boolean(currentUser?.following?.some((email) => email.toLowerCase() === targetEmail)),
  };
}
type FollowRecord = {
  _id: { toString: () => string };
  email: string;
  name: string;
  username?: string;
  image?: string;
};

type PersonSummary = {
  id: string;
  name: string;
  username?: string;
  image?: string;
  isFollowing: boolean;
  isSelf: boolean;
};

type FollowList = {
  people: PersonSummary[];
  totalCount: number;
  page: number;
  totalPages: number;
};

// Followers/following for one profile, filtered and paged. `isFollowing` and `isSelf`
// are resolved here because they need the viewer's `following`, a document the caller
// does not have.
export async function getFollowList({
  username,
  mode,
  query,
  requestedPage,
  currentEmail,
}: {
  username: string;
  mode: "followers" | "following";
  query: string;
  requestedPage: number;
  currentEmail?: string;
}): Promise<FollowList | null> {
  await dbConnect();

  const user = await User.findOne({ username }).select("_id email following").lean<{
    email: string;
    following?: string[];
  } | null>();

  if (!user) {
    return null;
  }

  const profileEmail = user.email.toLowerCase();
  const followedEmails = (user.following || []).map((email) => email.toLowerCase());
  const searchPattern = query ? new RegExp(escapeRegExp(query), "i") : null;

  const peopleFilter =
    mode === "followers"
      ? searchPattern
        ? {
            following: profileEmail,
            $or: [{ name: searchPattern }, { username: searchPattern }],
          }
        : { following: profileEmail }
      : searchPattern
        ? {
            email: { $in: followedEmails },
            $or: [{ name: searchPattern }, { username: searchPattern }],
          }
        : { email: { $in: followedEmails } };

  const [totalCount, currentUser] = await Promise.all([
    User.countDocuments(peopleFilter),
    currentEmail
      ? User.findOne({ email: currentEmail }).select("following").lean<{ following?: string[] } | null>()
      : Promise.resolve(null),
  ]);

  const { page, totalPages } = pageBounds(totalCount, requestedPage, PEOPLE_PAGE_SIZE);

  const records = totalCount
    ? await User.find(peopleFilter)
        .select("_id email name username image")
        .sort({ name: 1, username: 1, _id: 1 })
        .skip((page - 1) * PEOPLE_PAGE_SIZE)
        .limit(PEOPLE_PAGE_SIZE)
        .lean<FollowRecord[]>()
    : [];

  const following = new Set((currentUser?.following || []).map((email) => email.toLowerCase()));

  return {
    people: records.map((person) => {
      const email = person.email.toLowerCase();
      return {
        id: person._id.toString(),
        name: person.name,
        username: person.username || undefined,
        image: person.image || undefined,
        isFollowing: following.has(email),
        isSelf: email === currentEmail,
      };
    }),
    totalCount,
    page,
    totalPages,
  };
}

type JournalHistoryRecord = WatchedRow;

// Keyed on mediaKey, not a document id: a watch is a state on a row, not a piece of writing.
function toJournalItem(row: WatchedRow): JournalItem {
  return {
    key: mediaKey(row.mediaType, row.movieId),
    title: row.title,
    posterPath: row.posterPath,
    watchedAt: row.watchedAt.toISOString(),
    movieId: row.movieId,
    mediaType: row.mediaType,
  };
}

type ProfileIdentity = {
  _id: { toString: () => string };
  name: string;
  email: string;
  bio?: string;
  image?: string;
  username?: string;
  createdAt?: Date;
  following?: string[];
};

type ProfileOverviewData = {
  favoriteCount: number;
  watchlistCount: number;
  reviewCount: number;
  listCount: number;
  uniqueWatchedCount: number;
  averageRating: number;
  ratedCount: number;
  currentStreak: number;
  recentJournal: JournalItem[];
  recentReviews: ReturnType<typeof serializeReview>[];
  recentLists: ReturnType<typeof serializeList>[];
};

type ProfilePage<T> = {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
};

type InsightsSource = {
  favorites: FavoriteMovie[];
  journal: JournalHistoryRecord[];
};

export async function getProfileIdentity(email: string): Promise<ProfileIdentity | null> {
  return User.findOne({ email })
    .select("_id name email bio image username createdAt following")
    .lean<ProfileIdentity | null>();
}

export async function getRelationshipCounts(identity: ProfileIdentity) {
  const followingEmails = [...new Set((identity.following || []).map((email) => email.toLowerCase()))];
  const [followers, following] = await Promise.all([
    User.countDocuments({ following: identity.email.toLowerCase() }),
    followingEmails.length
      ? User.countDocuments({ email: { $in: followingEmails } })
      : Promise.resolve(0),
  ]);
  return { followers, following };
}

export async function getProfileOverview(email: string): Promise<ProfileOverviewData> {
  const [
    favoriteCount,
    watchlistCount,
    rated,
    watchedCount,
    reviewCount,
    listCount,
    recentWatched,
    currentHistory,
    rawReviews,
    rawLists,
  ] = await Promise.all([
    UserMovie.countDocuments({ userEmail: email, "favorite.addedAt": { $ne: null } }),
    UserMovie.countDocuments({ userEmail: email, "watchlist.addedAt": { $ne: null } }),
    UserMovie.aggregate<{ averageRating: number | null; ratedCount: number }>([
      { $match: { userEmail: email, "favorite.personalRating": { $gt: 0 } } },
      { $group: { _id: null, average: { $avg: "$favorite.personalRating" }, ratedCount: { $sum: 1 } } },
      { $project: { _id: 0, averageRating: { $round: [{ $divide: ["$average", 2] }, 1] }, ratedCount: 1 } },
    ]),
    UserMovie.countDocuments({ userEmail: email, "watched.watchedAt": { $ne: null } }),
    Review.countDocuments({ userEmail: email }),
    MovieList.countDocuments({ userEmail: email }),
    listWatchHistory(email, { limit: 8 }),
    listWatchDays(email),
    Review.find({ userEmail: email })
      .sort({ createdAt: -1, _id: -1 })
      .limit(4)
      .lean<RawReview[]>(),
    MovieList.find({ userEmail: email })
      .select(
        "_id userEmail userName title description visibility likedBy savedBy createdAt movies.movieId"
      )
      .sort({ createdAt: -1, _id: -1 })
      .limit(4)
      .lean<RawMovieList[]>(),
  ]);

  const streakData = buildWatchStreaks(currentHistory as Date[]);

  return {
    favoriteCount,
    watchlistCount,
    reviewCount,
    listCount,
    uniqueWatchedCount: watchedCount,
    averageRating: rated[0]?.averageRating || 0,
    ratedCount: rated[0]?.ratedCount || 0,
    currentStreak: streakData.current,
    recentJournal: recentWatched.map(toJournalItem),
    recentReviews: rawReviews.map(serializeReview),
    recentLists: rawLists.map(serializeList),
  };
}

async function loadUserFavorites(email: string): Promise<FavoriteMovie[]> {
  const { rows } = await listUserMedia(email, "favorite");
  return rows.map(toFavoriteMovie);
}


export async function getInsightsSource(email: string): Promise<InsightsSource> {
  const [favorites, journal] = await Promise.all([
    loadUserFavorites(email),
    listWatchHistory(email),
  ]);
  return { favorites, journal };
}

export async function getFavoritePage(
  email: string,
  requestedPage: number
): Promise<ProfilePage<FavoriteMovie>> {
  return mediaPage(email, "favorite", requestedPage, PROFILE_PAGE_SIZES.favorites);
}

export async function getWatchlistPage(
  email: string,
  requestedPage: number
): Promise<ProfilePage<WatchlistMovie>> {
  return mediaPage(email, "watchlist", requestedPage, PROFILE_PAGE_SIZES.watchlist);
}

async function mediaPage(
  email: string,
  state: "favorite" | "watchlist",
  requestedPage: number,
  pageSize: number
): Promise<ProfilePage<FavoriteMovie | WatchlistMovie>> {
  const first = await listUserMedia(email, state, { skip: (requestedPage - 1) * pageSize, limit: pageSize });

  // Only a favorite carries a rating, and addedAt is the watchlist date on the watchlist
  // tab (see toMediaRow).
  const toItem = state === "watchlist" ? toWatchlistMovie : toFavoriteMovie;

  // Clamped like paginate: an out-of-range page re-reads the last real page.
  const bounds = pageBounds(first.total, requestedPage, pageSize);
  if (bounds.page === requestedPage) {
    return { items: first.rows.map(toItem), ...bounds, total: first.total };
  }

  const last = await listUserMedia(email, state, { skip: (bounds.page - 1) * pageSize, limit: pageSize });
  return { items: last.rows.map(toItem), ...bounds, total: last.total };
}

export async function getReviewPage(email: string, requestedPage: number) {
  const [page, favorites] = await Promise.all([
    paginate<RawReview>(Review, { userEmail: email }, { createdAt: -1, _id: -1 }, requestedPage, PROFILE_PAGE_SIZES.reviews),
    loadUserFavorites(email),
  ]);
  const { rows, ...bounds } = page;
  return {
    items: rows.map(serializeReview),
    ratingMap: buildRatingMap(favorites),
    ...bounds,
  };
}

export async function getListPage(email: string, requestedPage: number): Promise<ProfilePage<ReturnType<typeof serializeList>>> {
  const { rows, ...bounds } = await paginate<RawMovieList>(
    MovieList,
    { userEmail: email },
    { createdAt: -1, _id: -1 },
    requestedPage,
    PROFILE_PAGE_SIZES.lists,
    "_id userEmail userName title description visibility createdAt movies.movieId"
  );
  return { items: rows.map(serializeList), ...bounds };
}

type ExportBundle = {
  exportedAt: string;
  user: {
    name: string;
    email: string;
    username?: string;
    bio?: string;
    joinedAt: Date;
  };
  favorites: ReturnType<typeof toExportFavorite>[];
  watchlist: ReturnType<typeof toExportMedia>[];
  following: string[];
  watched: ReturnType<typeof toExportWatched>[];
  reviews: unknown[];
  lists: unknown[];
};

// Everything a member has written or saved, in one document. Secrets are projected out rather
// than deleted afterwards, so a forgotten destructure cannot leak them. Media sections keep
// their flat shape, so an export stays readable by whatever consumed the old one.
export async function buildExportBundle(email: string): Promise<ExportBundle | null> {
  await dbConnect();

  const [user, favorites, watchlist, watched, reviews, lists] = await Promise.all([
    // The media state comes from the listUserMedia calls below, not from here.
    User.findOne({ email })
      .select("-password -verifyToken -resetToken")
      .lean(),
    listUserMedia(email, "favorite"),
    listUserMedia(email, "watchlist"),
    listWatchHistory(email),
    Review.find({ userEmail: email }).sort({ createdAt: 1 }).lean(),
    MovieList.find({ userEmail: email }).sort({ createdAt: 1 }).lean(),
  ]);

  if (!user) {
    return null;
  }

  return {
    exportedAt: new Date().toISOString(),
    user: {
      name: user.name,
      email: user.email,
      username: user.username,
      bio: user.bio,
      joinedAt: user.createdAt,
    },
    favorites: favorites.rows.map(toExportFavorite),
    watchlist: watchlist.rows.map(toExportMedia),
    following: user.following || [],
    watched: watched.map(toExportWatched),
    reviews,
    lists,
  };
}

// Flat, matching the other exported sections: `watchedAt` at the top level, not nested.
function toExportWatched(row: WatchedRow) {
  return {
    movieId: row.movieId,
    mediaType: row.mediaType,
    title: row.title,
    posterPath: row.posterPath,
    watchedAt: row.watchedAt.toISOString(),
  };
}

// Flattened to the shape the arrays had, so an export does not leak the storage layout
// into a member own data file.
function toExportMedia(row: MediaRow) {
  return {
    movieId: row.movieId,
    mediaType: row.mediaType,
    title: row.title,
    posterPath: row.posterPath,
    voteAverage: row.voteAverage,
    releaseDate: row.releaseDate,
    genreIds: row.genreIds,
    addedAt: row.addedAt?.toISOString(),
  };
}

function toExportFavorite(row: MediaRow) {
  return { ...toExportMedia(row), personalRating: row.personalRating };
}

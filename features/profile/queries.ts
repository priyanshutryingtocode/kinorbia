import "server-only";

import dbConnect from "@/lib/dbConnect";
import { escapeRegExp, type LibraryFacetParams } from "@/lib/searchParams";
import { buildWatchStreaks } from "@/lib/insights";
import { pageBounds, paginate } from "@/lib/pagination";
import { mediaKey } from "@/lib/media";
import { publiclyVisible } from "@/lib/visibility";
import {
  listUserMedia,
  listUserMediaRows,
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

export async function getPublicProfileData({
  username,
  currentEmail,
}: {
  username: string;
  currentEmail?: string;
}): Promise<PublicProfileData | null> {
  await dbConnect();

  const user = await User.findOne({ username })
    .select("_id name email bio image username createdAt following shareActivity")
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
  shareActivity?: boolean;
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
  ratedCount?: number;
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
  const rows = await listUserMediaRows(email, "favorite");
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
  requestedPage: number,
  facets?: LibraryFacetParams
): Promise<ProfilePage<FavoriteMovie>> {
  return mediaPage(email, "favorite", requestedPage, PROFILE_PAGE_SIZES.favorites, facets);
}

export async function getWatchlistPage(
  email: string,
  requestedPage: number,
  facets?: LibraryFacetParams
): Promise<ProfilePage<WatchlistMovie>> {
  return mediaPage(email, "watchlist", requestedPage, PROFILE_PAGE_SIZES.watchlist, facets);
}

async function mediaPage(
  email: string,
  state: "favorite" | "watchlist",
  requestedPage: number,
  pageSize: number,
  facets?: LibraryFacetParams
): Promise<ProfilePage<FavoriteMovie | WatchlistMovie>> {
  const options = { facets } as const;
  const first = await listUserMedia(email, state, {
    ...options,
    skip: (requestedPage - 1) * pageSize,
    limit: pageSize,
  });

  const toItem = state === "watchlist" ? toWatchlistMovie : toFavoriteMovie;
  const ratedCount =
    state === "watchlist"
      ? await UserMovie.countDocuments({
          userEmail: email,
          "watchlist.addedAt": { $ne: null },
          "favorite.personalRating": { $gt: 0 },
        })
      : undefined;

  const bounds = pageBounds(first.total, requestedPage, pageSize);
  if (bounds.page === requestedPage) {
    return { items: first.rows.map(toItem), ...bounds, total: first.total, ratedCount };
  }

  const last = await listUserMedia(email, state, {
    ...options,
    skip: (bounds.page - 1) * pageSize,
    limit: pageSize,
  });
  return { items: last.rows.map(toItem), ...bounds, total: last.total, ratedCount };
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

type ExportReview = {
  _id: string;
  userName: string;
  posterPath?: string | null;
  title: string;
  movieId?: string;
  mediaType?: string;
  body: string;
  spoiler?: boolean;
  visibility: string;
  createdAt?: string;
  updatedAt?: string;
  likesCount: number;
  savesCount: number;
};

type ExportList = {
  _id: string;
  userName: string;
  title: string;
  description?: string;
  visibility: string;
  movies: {
    movieId: string;
    mediaType: string;
    title: string;
    posterPath?: string | null;
    voteAverage?: number;
    releaseDate?: string;
  }[];
  createdAt?: string;
  updatedAt?: string;
  likesCount: number;
  savesCount: number;
};

type ExportBundle = {
  exportedAt: string;
  user: {
    _id: string;
    name: string;
    email: string;
    username?: string;
    bio?: string;
    image?: string | null;
    provider?: string;
    emailVerified?: string;
    shareActivity?: boolean;
    shareActivityAsked?: boolean;
    joinedAt: string;
    updatedAt?: string;
  };
  favorites: ReturnType<typeof toExportFavorite>[];
  watchlist: ReturnType<typeof toExportWatchlistMedia>[];
  following: string[];
  followersCount: number;
  watched: ReturnType<typeof toExportWatched>[];
  reviews: ExportReview[];
  lists: ExportList[];
};

const EXPORT_REVIEW_PROJECTION = {
  userEmail: 1, userName: 1, movieId: 1, title: 1, posterPath: 1, mediaType: 1,
  body: 1, visibility: 1, spoiler: 1, createdAt: 1, updatedAt: 1,
  likesCount: { $size: { $ifNull: ["$likedBy", []] } },
  savesCount: { $size: { $ifNull: ["$savedBy", []] } },
};

const EXPORT_LIST_PROJECTION = {
  userEmail: 1, userName: 1, title: 1, description: 1, movies: 1, visibility: 1,
  createdAt: 1, updatedAt: 1,
  likesCount: { $size: { $ifNull: ["$likedBy", []] } },
  savesCount: { $size: { $ifNull: ["$savedBy", []] } },
};

export async function buildExportBundle(email: string): Promise<ExportBundle | null> {
  await dbConnect();

  const [user, favorites, watchlist, watched, reviews, lists, followersCount] = await Promise.all([
    User.findOne({ email })
      .select("-password -verifyToken -resetToken")
      .lean(),
    listUserMediaRows(email, "favorite"),
    listUserMediaRows(email, "watchlist"),
    listWatchHistory(email),
    Review.aggregate([
      { $match: { userEmail: email } },
      { $sort: { createdAt: 1 } },
      { $project: EXPORT_REVIEW_PROJECTION },
    ]),
    MovieList.aggregate([
      { $match: { userEmail: email } },
      { $sort: { createdAt: 1 } },
      { $project: EXPORT_LIST_PROJECTION },
    ]),
    User.countDocuments({ following: email }),
  ]);

  if (!user) {
    return null;
  }

  const following = await toExportFollowing(user.following ?? []);

  return {
    exportedAt: new Date().toISOString(),
    user: {
      _id: String(user._id),
      name: user.name,
      email: user.email,
      username: user.username,
      bio: user.bio,
      image: user.image ?? null,
      provider: user.provider,
      emailVerified:
        user.emailVerified instanceof Date ? user.emailVerified.toISOString() : undefined,
      shareActivity: Boolean(user.shareActivity),
      shareActivityAsked: Boolean(user.shareActivityAsked),
      joinedAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : "",
      updatedAt: user.updatedAt instanceof Date ? user.updatedAt.toISOString() : undefined,
    },
      favorites: favorites.map(toExportFavorite),
      watchlist: watchlist.map(toExportWatchlistMedia),
    following,
    followersCount,
    watched: watched.map(toExportWatched),
    reviews: reviews.map(toExportReview),
    lists: lists.map(toExportList),
  };
}

async function toExportFollowing(emails: string[]): Promise<string[]> {
  if (emails.length === 0) return [];

  const followed = await User.find({ email: { $in: emails } })
    .select("username")
    .lean<{ username?: string }[]>();

  const usernames = followed.map((doc) => doc.username).filter((name): name is string => Boolean(name));

  return usernames.sort((a, b) => a.localeCompare(b));
}

function toExportReview(row: Record<string, unknown>): ExportReview {
  return {
    _id: String(row._id),
    userName: String(row.userName ?? ""),
    title: String(row.title ?? ""),
    posterPath: (row.posterPath ?? null) as string | null,
    movieId: row.movieId as string | undefined,
    mediaType: row.mediaType as string | undefined,
    body: String(row.body ?? ""),
    spoiler: Boolean(row.spoiler),
    visibility: String(row.visibility ?? "public"),
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : undefined,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : undefined,
    likesCount: Number(row.likesCount ?? 0),
    savesCount: Number(row.savesCount ?? 0),
  };
}

function toExportList(row: Record<string, unknown>): ExportList {
  const movies = Array.isArray(row.movies) ? row.movies : [];

  return {
    _id: String(row._id),
    userName: String(row.userName ?? ""),
    title: String(row.title ?? ""),
    description: row.description as string | undefined,
    visibility: String(row.visibility ?? "public"),
    movies: movies.map((entry) => {
      const movie = (entry ?? {}) as Record<string, unknown>;
      return {
        movieId: String(movie.movieId ?? ""),
        mediaType: String(movie.mediaType ?? "movie"),
        title: String(movie.title ?? ""),
        posterPath: (movie.posterPath ?? null) as string | null,
        voteAverage: typeof movie.voteAverage === "number" ? movie.voteAverage : undefined,
        releaseDate: movie.releaseDate as string | undefined,
      };
    }),
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : undefined,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : undefined,
    likesCount: Number(row.likesCount ?? 0),
    savesCount: Number(row.savesCount ?? 0),
  };
}

function toExportWatched(row: WatchedRow) {
  return {
    movieId: row.movieId,
    mediaType: row.mediaType,
    title: row.title,
    posterPath: row.posterPath,
    voteAverage: row.voteAverage,
    releaseDate: row.releaseDate,
    genreIds: row.genreIds,
    personalRating: row.personalRating,
    broadcast: row.broadcast,
    watchedAt: row.watchedAt.toISOString(),
  };
}

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

function toExportWatchlistMedia(row: MediaRow) {
  return {
    ...toExportMedia(row),
    ...(row.personalRating > 0 ? { personalRating: row.personalRating } : {}),
  };
}

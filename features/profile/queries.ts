import "server-only";

import dbConnect from "@/lib/dbConnect";
import { escapeRegExp, type LibraryFacetParams } from "@/lib/searchParams";
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
  // How many rows in the UNFILTERED set carry a personal rating. Only meaningful for the
  // watchlist, where it decides whether the rating facet is offered at all.
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

  // Only a favorite carries a rating, and addedAt is the watchlist date on the watchlist
  // tab (see toMediaRow).
  const toItem = state === "watchlist" ? toWatchlistMovie : toFavoriteMovie;

  // A watchlist title can be rated when it is also a favorite -- both states live on the same
  // usermovies row. Counted over the WHOLE unfiltered set rather than the current page:
  // whether to offer the rating facet cannot depend on which page you landed on, or the same
  // member would see it on page 1 and not on page 3. A countDocuments, not a row fetch --
  // the watchlist is capped at 2500 and counting in JS would read all of it.
  const ratedCount =
    state === "watchlist"
      ? await UserMovie.countDocuments({
          userEmail: email,
          "watchlist.addedAt": { $ne: null },
          "favorite.personalRating": { $gt: 0 },
        })
      : undefined;

  // Clamped like paginate: an out-of-range page re-reads the last real page.
  const bounds = pageBounds(first.total, requestedPage, pageSize);
  if (bounds.page === requestedPage) {
    return { items: first.rows.map(toItem), ...bounds, total: first.total, ratedCount };
  }

  // Narrowing by facet can leave the member on a page that no longer exists, so the clamped
  // read has to carry the same facets or it would silently fall back to the full library.
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

// A review as exported: the author's own content, plus COUNTS of who engaged with it.
// Never the identity of anyone else -- see toExportReview.
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
  // mediaType is what makes a list entry usable: `mediaKey` is `mediaType:movieId`, so an
  // entry without it is ambiguous between a movie and a show. TMDB movie and TV id spaces
  // overlap numerically, so this is not recoverable from the id.
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
    // Consent state. Not a counter or a cache -- it is the member's own decision, and they
    // cannot meaningfully exercise it without seeing it.
    shareActivity?: boolean;
    shareActivityAsked?: boolean;
    joinedAt: string;
    updatedAt?: string;
  };
  favorites: ReturnType<typeof toExportFavorite>[];
  watchlist: ReturnType<typeof toExportWatchlistMedia>[];
  // Usernames, never email addresses. See toExportFollowing.
  following: string[];
  // Inbound follows are a count only. Who follows you is not your relationship to export, and
  // listing it would disclose handles for people who never interacted with you.
  followersCount: number;
  watched: ReturnType<typeof toExportWatched>[];
  reviews: ExportReview[];
  lists: ExportList[];
};

// Everything a member has written or saved, in one document. Media sections keep their flat
// shape, so an export stays readable by whatever consumed the old one.
//
// Two different projections, because the risk is not uniform. The member's OWN User document is
// read with `select("-password -verifyToken -resetToken")`, so a secret cannot be read at all.
// Reviews and lists are read through an aggregation that emits an explicit field list, and
// `likedBy`/`savedBy` are reduced to counts INSIDE the database: those two arrays hold other
// members' email addresses, so they never leave Mongo to be handled correctly further down.
// A hand-written mapper is not a privacy boundary -- one forgotten destructure leaks 132
// addresses, which is exactly what happened here once. `following` maps emails to usernames for
// the same reason.
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
    // The media state comes from the listUserMedia calls below, not from here.
    User.findOne({ email })
      .select("-password -verifyToken -resetToken")
      .lean(),
    listUserMedia(email, "favorite"),
    listUserMedia(email, "watchlist"),
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
    // Inbound, so it cannot come off the member document the way `following` does.
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
    favorites: favorites.rows.map(toExportFavorite),
    watchlist: watchlist.rows.map(toExportWatchlistMedia),
    following,
    followersCount,
    watched: watched.map(toExportWatched),
    reviews: reviews.map(toExportReview),
    lists: lists.map(toExportList),
  };
}

// Usernames, not emails. A member's follow list is their own data, but the entries are other
// people's email addresses, and an export is a file that gets forwarded and attached to
// tickets.
//
// `username` is sparse, so a member without one is omitted rather than falling back to their
// address -- the fallback would reintroduce exactly the leak this function exists to close.
async function toExportFollowing(emails: string[]): Promise<string[]> {
  if (emails.length === 0) return [];

  const followed = await User.find({ email: { $in: emails } })
    .select("username")
    .lean<{ username?: string }[]>();

  const usernames = followed.map((doc) => doc.username).filter((name): name is string => Boolean(name));

  return usernames.sort((a, b) => a.localeCompare(b));
}

// The counts arrive already computed by the aggregation projection, because likedBy/savedBy
// are other members' addresses and must not be read into the process at all. The member gets
// what an export is for -- how well their content did -- without a list of who touched it.
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

// Flat, matching the other exported sections: `watchedAt` at the top level, not nested.
// `broadcast` is the per-row record of what the member agreed to share publicly, so it belongs
// here: without it an export cannot answer "which of my watches did I broadcast?".
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

// A watchlist entry can carry a rating when the title is also a favorite -- favorite and
// watchlist are states on the same row. Emitted only when there is one: `undefined` keys are
// dropped by JSON.stringify, so an unrated entry has no key rather than a misleading 0.
function toExportWatchlistMedia(row: MediaRow) {
  return {
    ...toExportMedia(row),
    ...(row.personalRating > 0 ? { personalRating: row.personalRating } : {}),
  };
}

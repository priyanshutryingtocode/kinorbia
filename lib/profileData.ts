import "server-only";

import User from "@/models/User";
import JournalEntry from "@/models/JournalEntry";
import Review from "@/models/Review";
import MovieList from "@/models/MovieList";
import dbConnect from "@/lib/dbConnect";
import { buildWatchStreaks } from "@/lib/insights";
import { buildRatingMap, dedupeFavorites } from "@/lib/reviewRatings";
import {
  serializeFavorites,
  serializeJournalEntry,
  serializeList,
  serializeReview,
  type RawFavoriteMovie,
  type RawJournalEntry,
  type RawMovieList,
  type RawReview,
} from "@/lib/serialize";
import type { FavoriteMovie, MediaType, WatchlistMovie } from "@/types";
import { mediaEquals, normalizeMediaType } from "@/lib/media";
import { emailMatch } from "@/lib/emailMatch";
import { pageBounds } from "@/lib/pagination";

export const PROFILE_PAGE_SIZES = {
  favorites: 20,
  watchlist: 20,
  reviews: 9,
  lists: 9,
} as const;

type JournalHistoryRecord = {
  _id: { toString: () => string };
  movieTitle: string;
  watchedAt: Date;
  mediaType?: MediaType;
  movieId?: string;
};

export type ProfileIdentity = {
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
  recentJournal: ReturnType<typeof serializeJournalEntry>[];
  recentReviews: ReturnType<typeof serializeReview>[];
  recentLists: ReturnType<typeof serializeList>[];
};

// Not exported: the only same-named import candidate is the profile page's own
// default-exported component, which makes a text search for `ProfilePage` lie
// about whether this type is used.
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

type PersonalMediaStatus = {
  isFavorite: boolean;
  personalRating: number;
  isWatchlisted: boolean;
  isWatched: boolean;
};

// Shared by the movie and TV detail pages. `mediaEquals` reproduces each
// page's own journal filter exactly (`{ $in: ["movie", null] }` / `"tv"`),
// so the two routes can no longer drift apart.
export async function getPersonalMediaStatus(
  email: string | null | undefined,
  id: string,
  mediaType: MediaType
): Promise<PersonalMediaStatus> {
  if (!email) {
    return { isFavorite: false, personalRating: 0, isWatchlisted: false, isWatched: false };
  }

  await dbConnect();

  // Only three fields per favorite and two per watchlist entry are needed, and
  // this runs on every film detail page view. The dotted projection keeps the
  // other five sub-fields of each entry out of the response, so the type is
  // narrowed to match what actually comes back rather than claiming to be a
  // full FavoriteMovie.
  const user = await User.findOne({ email: emailMatch(email) })
    .select(
      "favorites.movieId favorites.mediaType favorites.personalRating watchlist.movieId watchlist.mediaType"
    )
    .lean<{
      favorites?: { movieId: string; mediaType?: string; personalRating?: number }[];
      watchlist?: { movieId: string; mediaType?: string }[];
    } | null>();

  const matches = (item: { movieId?: string; mediaType?: string }) =>
    item.movieId === id && normalizeMediaType(item.mediaType) === mediaType;

  const favorite = user?.favorites?.find(matches);

  const journalEntry = await JournalEntry.findOne({
    userEmail: email,
    movieId: id,
    mediaType: mediaEquals(mediaType),
  })
    .select("_id")
    .lean<{ _id?: unknown } | null>();

  return {
    isFavorite: Boolean(favorite),
    personalRating: favorite?.personalRating || 0,
    isWatchlisted: Boolean(user?.watchlist?.some(matches)),
    isWatched: Boolean(journalEntry),
  };
}

function uniqueMediaItems(field: "favorites" | "watchlist") {
  return {
    $reduce: {
      input: { $reverseArray: { $ifNull: [`$${field}`, []] } },
      initialValue: [],
      in: {
        $cond: [
          {
            $in: [
              {
                $concat: [
                  { $ifNull: ["$$this.mediaType", "movie"] },
                  ":",
                  { $toString: { $ifNull: ["$$this.movieId", ""] } },
                ],
              },
              {
                $map: {
                  input: "$$value",
                  as: "favorite",
                  in: {
                    $concat: [
                      { $ifNull: ["$$favorite.mediaType", "movie"] },
                      ":",
                      { $toString: { $ifNull: ["$$favorite.movieId", ""] } },
                    ],
                  },
                },
              },
            ],
          },
          "$$value",
          { $concatArrays: ["$$value", ["$$this"]] },
        ],
      },
    },
  };
}

type SortSpec = Record<string, 1 | -1>;

type PageableQuery<TRaw> = {
  sort(sort: SortSpec): PageableQuery<TRaw>;
  select(fields: string): PageableQuery<TRaw>;
  skip(skip: number): PageableQuery<TRaw>;
  limit(limit: number): PageableQuery<TRaw>;
  lean(): Promise<TRaw[]>;
};

type PageableModel<TRaw> = {
  countDocuments(filter: Record<string, unknown>): Promise<number>;
  find(filter: Record<string, unknown>): PageableQuery<TRaw>;
};

// Shared count + windowed fetch. When the requested page is past the end, the
// clamped page is re-fetched instead of returning an empty result set.
async function paginate<TRaw>(
  model: PageableModel<TRaw>,
  filter: Record<string, unknown>,
  sort: SortSpec,
  requestedPage: number,
  pageSize: number,
  // Optional so a caller that renders a summary card can leave the unbounded
  // likedBy/savedBy arrays behind instead of shipping them with every row.
  projection?: string
): Promise<{ rows: TRaw[]; page: number; totalPages: number; total: number }> {
  const fetchPage = (page: number) => {
    const query = model.find(filter);
    return (projection ? query.select(projection) : query)
      .sort(sort)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean();
  };

  const [total, initialRows] = await Promise.all([
    model.countDocuments(filter),
    fetchPage(Math.max(1, requestedPage)),
  ]);

  const bounds = pageBounds(total, requestedPage, pageSize);
  const rows = bounds.page === requestedPage ? initialRows : await fetchPage(bounds.page);

  return { rows, total, ...bounds };
}

async function getEmbeddedPage(
  email: string,
  field: "favorites" | "watchlist",
  requestedPage: number,
  pageSize: number
): Promise<ProfilePage<FavoriteMovie>> {
  const uniqueItems = uniqueMediaItems(field);
  const fetchRow = (page: number) =>
    User.aggregate<{ items: RawFavoriteMovie[]; total: number }>([
      { $match: { email } },
      {
        $project: {
          total: { $size: uniqueItems },
          items: {
            $slice: [
              uniqueItems,
              (page - 1) * pageSize,
              pageSize,
            ],
          },
        },
      },
    ]).limit(1);

  let row = (await fetchRow(Math.max(1, requestedPage)))[0] || { items: [], total: 0 };
  const bounds = pageBounds(row.total, requestedPage, pageSize);
  if (bounds.page !== requestedPage) {
    row = (await fetchRow(bounds.page))[0] || { items: [], total: 0 };
  }
  return { items: serializeFavorites(row.items), ...bounds, total: row.total };
}

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
  const uniqueFavorites = uniqueMediaItems("favorites");
  const uniqueWatchlist = uniqueMediaItems("watchlist");
  const [
    summaryRows,
    uniqueWatchedRows,
    reviewCount,
    listCount,
    rawJournal,
    currentHistory,
    rawReviews,
    rawLists,
  ] = await Promise.all([
    User.aggregate<{
      favoriteCount: number;
      watchlistCount: number;
      averageRating: number | null;
      ratedCount: number;
    }>([
      { $match: { email } },
      { $set: { uniqueFavorites, uniqueWatchlist } },
      {
        $project: {
          favoriteCount: { $size: "$uniqueFavorites" },
          watchlistCount: { $size: "$uniqueWatchlist" },
          ratedFavorites: {
            $filter: {
              input: "$uniqueFavorites",
              as: "favorite",
              cond: { $gt: ["$$favorite.personalRating", 0] },
            },
          },
        },
      },
      {
        $project: {
          favoriteCount: 1,
          watchlistCount: 1,
          averageRating: {
            $round: [{ $divide: [{ $avg: "$ratedFavorites.personalRating" }, 2] }, 1],
          },
          ratedCount: { $size: "$ratedFavorites" },
        },
      },
    ]).limit(1),
    JournalEntry.aggregate<{ count: number }>([
      { $match: { userEmail: email } },
      {
        $group: {
          _id: {
            mediaType: { $ifNull: ["$mediaType", "movie"] },
            identity: { $ifNull: ["$movieId", "$_id"] },
          },
        },
      },
      { $count: "count" },
    ]),
    Review.countDocuments({ userEmail: email }),
    MovieList.countDocuments({ userEmail: email }),
    JournalEntry.find({ userEmail: email })
      .sort({ watchedAt: -1, createdAt: -1, _id: -1 })
      .limit(8)
      .lean<RawJournalEntry[]>(),
    JournalEntry.distinct("watchedAt", { userEmail: email }),
    Review.find({ userEmail: email })
      .sort({ createdAt: -1, _id: -1 })
      .limit(4)
      .lean<RawReview[]>(),
    // The consumer only counts `movies`, so each of a list's (up to 500)
    // entries is narrowed to its id rather than shipping all six fields. The
    // document-level fields are left intact because `serializeList` reads them.
    MovieList.find({ userEmail: email })
      .select(
        "_id userEmail userName title description visibility likedBy savedBy createdAt movies.movieId"
      )
      .sort({ createdAt: -1, _id: -1 })
      .limit(4)
      .lean<RawMovieList[]>(),
  ]);

  const summary = summaryRows[0];
  const streakData = buildWatchStreaks(currentHistory as Date[]);
  return {
    favoriteCount: summary?.favoriteCount || 0,
    watchlistCount: summary?.watchlistCount || 0,
    reviewCount,
    listCount,
    uniqueWatchedCount: uniqueWatchedRows[0]?.count || 0,
    averageRating: summary?.averageRating || 0,
    ratedCount: summary?.ratedCount || 0,
    currentStreak: streakData.current,
    recentJournal: rawJournal.map(serializeJournalEntry),
    recentReviews: rawReviews.map(serializeReview),
    recentLists: rawLists.map(serializeList),
  };
}

function loadUserFavorites(email: string): Promise<FavoriteMovie[]> {
  return User.findOne({ email })
    .select("favorites")
    .lean<{ favorites?: RawFavoriteMovie[] } | null>()
    .then((user) => dedupeFavorites(serializeFavorites(user?.favorites)));
}

export async function getInsightsSource(email: string): Promise<InsightsSource> {
  const [favorites, journal] = await Promise.all([
    loadUserFavorites(email),
    JournalEntry.find({ userEmail: email })
      .select("_id movieTitle watchedAt mediaType movieId")
      .lean<JournalHistoryRecord[]>(),
  ]);
  return { favorites, journal };
}

export async function getFavoritePage(email: string, requestedPage: number): Promise<ProfilePage<FavoriteMovie>> {
  return getEmbeddedPage(email, "favorites", requestedPage, PROFILE_PAGE_SIZES.favorites);
}

export async function getWatchlistPage(email: string, requestedPage: number): Promise<ProfilePage<WatchlistMovie>> {
  return getEmbeddedPage(email, "watchlist", requestedPage, PROFILE_PAGE_SIZES.watchlist);
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
    // Every document-level field `serializeList` reads has to be here, and it
    // reads them unconditionally: `createdAt.toISOString()` threw a TypeError
    // when the projection omitted it, which broke this tab outright for anyone
    // with at least one list. (Users with none never noticed, because `.map`
    // over an empty array never calls the serializer.)
    //
    // The two unbounded social arrays are the only thing left out, which is the
    // point of the projection -- a 500-title list does not need to ship the
    // email lists of everyone who liked it. Same string as getProfileOverview's
    // list query above, minus likedBy/savedBy.
    "_id userEmail userName title description visibility createdAt movies.movieId"
  );
  return { items: rows.map(serializeList), ...bounds };
}

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
import { pageBounds, paginate } from "@/lib/pagination";

export const PROFILE_PAGE_SIZES = {
  favorites: 20,
  watchlist: 20,
  reviews: 9,
  lists: 9,
} as const;

export const PEOPLE_PAGE_SIZE = 24;

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

export type PersonalMediaStatus = {
  isFavorite: boolean;
  personalRating: number;
  isWatchlisted: boolean;
  isWatched: boolean;
};

export async function getPersonalMediaStatus(
  email: string | null | undefined,
  id: string,
  mediaType: MediaType
): Promise<PersonalMediaStatus> {
  if (!email) {
    return { isFavorite: false, personalRating: 0, isWatchlisted: false, isWatched: false };
  }

  await dbConnect();

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

  const favorite = user?.favorites
    ? [...user.favorites].reverse().find(matches)
    : undefined;

  const journalEntry = await JournalEntry.findOne({
    userEmail: emailMatch(email),
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
    "_id userEmail userName title description visibility createdAt movies.movieId"
  );
  return { items: rows.map(serializeList), ...bounds };
}

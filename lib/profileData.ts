import "server-only";

import User from "@/models/User";
import JournalEntry from "@/models/JournalEntry";
import Review from "@/models/Review";
import MovieList from "@/models/MovieList";
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

export const PROFILE_PAGE_SIZES = {
  favorites: 20,
  watchlist: 20,
  reviews: 9,
  lists: 9,
  journal: 10,
} as const;

type JournalHistoryRecord = {
  _id: { toString: () => string };
  movieTitle: string;
  posterPath?: string | null;
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

export type ProfileOverviewData = {
  favoriteCount: number;
  watchlistCount: number;
  reviewCount: number;
  listCount: number;
  watchLogCount: number;
  uniqueWatchedCount: number;
  averageRating: number;
  ratedCount: number;
  currentStreak: number;
  recentJournal: ReturnType<typeof serializeJournalEntry>[];
  recentReviews: ReturnType<typeof serializeReview>[];
  recentLists: ReturnType<typeof serializeList>[];
};

export type ProfilePage<T> = {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
};

export type InsightsSource = {
  favorites: FavoriteMovie[];
  journal: JournalHistoryRecord[];
};

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

function pageBounds(total: number, requestedPage: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    page: Math.min(Math.max(1, requestedPage), totalPages),
    totalPages,
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
    watchLogCount,
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
    JournalEntry.countDocuments({ userEmail: email }),
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
    watchLogCount,
    uniqueWatchedCount: uniqueWatchedRows[0]?.count || 0,
    averageRating: summary?.averageRating || 0,
    ratedCount: summary?.ratedCount || 0,
    currentStreak: streakData.current,
    recentJournal: rawJournal.map(serializeJournalEntry),
    recentReviews: rawReviews.map(serializeReview),
    recentLists: rawLists.map(serializeList),
  };
}

export async function getInsightsSource(email: string): Promise<InsightsSource> {
  const [user, journal] = await Promise.all([
    User.findOne({ email }).select("favorites").lean<{ favorites?: RawFavoriteMovie[] } | null>(),
    JournalEntry.find({ userEmail: email })
      .select("_id movieTitle posterPath watchedAt mediaType movieId")
      .lean<JournalHistoryRecord[]>(),
  ]);
  return {
    favorites: dedupeFavorites(serializeFavorites(user?.favorites || [])),
    journal,
  };
}

export async function getFavoritePage(email: string, requestedPage: number): Promise<ProfilePage<FavoriteMovie>> {
  return getEmbeddedPage(email, "favorites", requestedPage, PROFILE_PAGE_SIZES.favorites);
}

export async function getWatchlistPage(email: string, requestedPage: number): Promise<ProfilePage<WatchlistMovie>> {
  return getEmbeddedPage(email, "watchlist", requestedPage, PROFILE_PAGE_SIZES.watchlist);
}

export async function getReviewPage(email: string, requestedPage: number) {
  const pageSize = PROFILE_PAGE_SIZES.reviews;
  const [total, initialReviews, user] = await Promise.all([
    Review.countDocuments({ userEmail: email }),
    Review.find({ userEmail: email })
      .sort({ createdAt: -1, _id: -1 })
      .skip((Math.max(1, requestedPage) - 1) * pageSize)
      .limit(pageSize)
      .lean<RawReview[]>(),
    User.findOne({ email }).select("favorites").lean<{ favorites?: RawFavoriteMovie[] } | null>(),
  ]);
  const bounds = pageBounds(total, requestedPage, pageSize);
  const rawReviews = bounds.page === requestedPage
    ? initialReviews
    : await Review.find({ userEmail: email })
        .sort({ createdAt: -1, _id: -1 })
        .skip((bounds.page - 1) * pageSize)
        .limit(pageSize)
        .lean<RawReview[]>();
  const favorites = dedupeFavorites(serializeFavorites(user?.favorites || []));
  return {
    items: rawReviews.map(serializeReview),
    ratingMap: buildRatingMap(favorites),
    ...bounds,
    total,
  };
}

export async function getListPage(email: string, requestedPage: number): Promise<ProfilePage<ReturnType<typeof serializeList>>> {
  const pageSize = PROFILE_PAGE_SIZES.lists;
  const [total, initialItems] = await Promise.all([
    MovieList.countDocuments({ userEmail: email }),
    MovieList.find({ userEmail: email })
      .sort({ createdAt: -1, _id: -1 })
      .skip((Math.max(1, requestedPage) - 1) * pageSize)
      .limit(pageSize)
      .lean<RawMovieList[]>(),
  ]);
  const bounds = pageBounds(total, requestedPage, pageSize);
  const items = bounds.page === requestedPage
    ? initialItems
    : await MovieList.find({ userEmail: email })
        .sort({ createdAt: -1, _id: -1 })
        .skip((bounds.page - 1) * pageSize)
        .limit(pageSize)
        .lean<RawMovieList[]>();
  return { items: items.map(serializeList), ...bounds, total };
}

export async function getJournalPage(email: string, requestedPage: number): Promise<ProfilePage<ReturnType<typeof serializeJournalEntry>>> {
  const pageSize = PROFILE_PAGE_SIZES.journal;
  const [total, initialItems] = await Promise.all([
    JournalEntry.countDocuments({ userEmail: email }),
    JournalEntry.find({ userEmail: email })
      .sort({ watchedAt: -1, createdAt: -1, _id: -1 })
      .skip((Math.max(1, requestedPage) - 1) * pageSize)
      .limit(pageSize)
      .lean<RawJournalEntry[]>(),
  ]);
  const bounds = pageBounds(total, requestedPage, pageSize);
  const items = bounds.page === requestedPage
    ? initialItems
    : await JournalEntry.find({ userEmail: email })
        .sort({ watchedAt: -1, createdAt: -1, _id: -1 })
        .skip((bounds.page - 1) * pageSize)
        .limit(pageSize)
        .lean<RawJournalEntry[]>();
  return { items: items.map(serializeJournalEntry), ...bounds, total };
}

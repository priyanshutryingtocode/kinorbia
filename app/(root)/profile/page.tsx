import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import { Film, Heart, List, Calendar, User as UserIcon, Bookmark, Star, Download } from "lucide-react";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import JournalEntry from "@/models/JournalEntry";
import MovieList from "@/models/MovieList";
import Review from "@/models/Review";
import ProfileActions from "@/components/profileActions";
import Link from "next/link";
import ProfileFavorites from "@/components/ProfileFavorites";
import ProfileInsights from "@/components/ProfileInsights";
import ReviewCard from "@/components/ReviewCard";
import { buildInsights, yearsFromJournal } from "@/lib/insights";
import { buildCommunityComparison } from "@/lib/community";
import { BarChart3 } from "lucide-react";
import { buildRatingMap, dedupeFavorites } from "@/lib/reviewRatings";
import EmptyState from "@/components/EmptyState";
import type { FavoriteMovie, JournalItem, MovieListItem, ReviewItem, WatchlistMovie } from "@/types";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile",
  description: "Your favorites, watch history, watchlist, reviews, lists, journal, and insights.",
};

type RawFavoriteMovie = Omit<FavoriteMovie, "addedAt"> & {
  _id?: { toString: () => string };
  addedAt?: Date | string;
};

type ProfileUser = {
  name?: string;
  bio?: string;
  email?: string;
  image?: string;
  username?: string;
  createdAt?: Date;
  favorites?: RawFavoriteMovie[];
  watchlist?: WatchlistMovie[];
  following?: string[];
};

type RawJournalEntry = Omit<JournalItem, "_id" | "createdAt" | "watchedAt"> & {
  _id: { toString: () => string };
  createdAt: Date;
  watchedAt: Date;
};

type RawReview = Omit<ReviewItem, "_id" | "createdAt"> & {
  _id: { toString: () => string };
  createdAt: Date;
};

type RawMovieList = Omit<MovieListItem, "_id" | "createdAt"> & {
  _id: { toString: () => string };
  createdAt: Date;
};

function serializeFavorites(favorites: RawFavoriteMovie[] = []): FavoriteMovie[] {
  return favorites.map((favorite) => ({
    movieId: favorite.movieId,
    title: favorite.title,
    posterPath: favorite.posterPath || null,
    voteAverage: favorite.voteAverage || 0,
    releaseDate: favorite.releaseDate,
    personalRating: favorite.personalRating || 0,
    mediaType: favorite.mediaType || "movie",
    genreIds: favorite.genreIds || [],
    addedAt: favorite.addedAt ? new Date(favorite.addedAt).toISOString() : undefined,
  }));
}

function serializeJournal(entry: RawJournalEntry): JournalItem {
  return {
    _id: entry._id.toString(),
    movieTitle: entry.movieTitle,
    posterPath: entry.posterPath,
    watchedAt: entry.watchedAt.toISOString(),
    note: entry.note,
    createdAt: entry.createdAt.toISOString(),
    movieId: entry.movieId,
    mediaType: entry.mediaType || "movie",
  };
}

function serializeReview(review: RawReview): ReviewItem {
  return {
    _id: review._id.toString(),
    userEmail: review.userEmail,
    userName: review.userName,
    movieTitle: review.movieTitle,
    posterPath: review.posterPath,
    body: review.body,
    visibility: review.visibility || "public",
    spoiler: Boolean(review.spoiler),
    movieId: review.movieId,
    mediaType: review.mediaType || "movie",
    likedBy: review.likedBy || [],
    savedBy: review.savedBy || [],
    createdAt: review.createdAt.toISOString(),
  };
}

function serializeList(list: RawMovieList): MovieListItem {
  return {
    _id: list._id.toString(),
    userEmail: list.userEmail,
    userName: list.userName,
    title: list.title,
    description: list.description,
    movies: list.movies,
    visibility: list.visibility || "public",
    createdAt: list.createdAt.toISOString(),
  };
}

function posterUrl(path?: string | null) {
  return path ? `https://image.tmdb.org/t/p/w185${path}` : null;
}

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

await dbConnect();
  const dbUser = await User.findOne({ email: session.user.email }).lean<ProfileUser | null>();
  const currentUserEmail = session.user.email || "";
  const favorites = dedupeFavorites(serializeFavorites(dbUser?.favorites));
const ownRatingMap = buildRatingMap(favorites);
  const watchlist = serializeFavorites(dbUser?.watchlist || []);
const [watchedMovieIds, listsCreated, followerCount, rawJournalEntries, rawReviews, rawLists, journalHistory] =
    await Promise.all([
      JournalEntry.distinct("movieId", { userEmail: session.user.email }),
      MovieList.countDocuments({ userEmail: session.user.email }),
      User.countDocuments({ following: session.user.email }),
      JournalEntry.find({ userEmail: session.user.email })
        .sort({ watchedAt: -1, createdAt: -1 })
        .limit(8)
        .lean<RawJournalEntry[]>(),
      Review.find({ userEmail: session.user.email })
        .sort({ createdAt: -1 })
        .limit(6)
        .lean<RawReview[]>(),
      MovieList.find({ userEmail: session.user.email })
        .sort({ createdAt: -1 })
        .limit(6)
        .lean<RawMovieList[]>(),
JournalEntry.find({ userEmail: session.user.email })
        .select("movieTitle posterPath watchedAt mediaType movieId")
        .lean<{
          movieTitle: string;
          posterPath?: string | null;
          watchedAt: Date;
          mediaType?: "movie" | "tv";
          movieId?: string;
        }[]>(),
    ]);
  const journalEntries = rawJournalEntries.map(serializeJournal);
  const reviews = rawReviews.map(serializeReview);
  const lists = rawLists.map(serializeList);
  const insights = buildInsights(journalHistory, favorites);
  const years = yearsFromJournal(journalHistory);
  const byYear: Record<string, ReturnType<typeof buildInsights>> = {};
  for (const year of years) {
    byYear[String(year)] = buildInsights(journalHistory, favorites, year);
  }
  const community = await buildCommunityComparison(favorites, currentUserEmail);
  const ratedMovies = favorites.filter(
    (movie) => movie.personalRating && movie.personalRating > 0
  );
  const averageRating = ratedMovies.length
    ? (ratedMovies.reduce((sum, movie) => sum + (movie.personalRating || 0), 0) / ratedMovies.length / 2).toFixed(1)
    : "0.0";

  const userData = {
    name: dbUser?.name || session.user.name || "User",
    bio: dbUser?.bio || "",
    email: dbUser?.email || "",
    image: dbUser?.image || session.user.image,
    username: dbUser?.username,
    createdAt: dbUser?.createdAt,
    favorites,
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white pb-20">
      
      <div className="h-64 w-full bg-linear-to-r from-neutral-900 via-red-950/30 to-neutral-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
        <div className="absolute bottom-0 left-0 w-full h-24 bg-linear-to-t from-neutral-950 to-transparent"></div>
      </div>

      <div className="max-w-5xl mx-auto px-6 -mt-24 relative z-10">
        
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 mb-12">
          <div className="relative group">
             <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-neutral-950 bg-neutral-800 overflow-hidden shadow-2xl">
               {userData.image ? (
                 <Image
                   src={userData.image}
                   alt={userData.name}
                   width={160}
                   height={160}
                   className="w-full h-full object-cover"
                 />
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-neutral-500">
                    <UserIcon className="w-16 h-16" />
                 </div>
               )}
             </div>
          </div>

          <div className="text-center md:text-left flex-1">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{userData.name}</h1>
            
            {userData.bio ? (
              <p className="text-neutral-300 text-sm mb-4 max-w-lg">{userData.bio}</p>
            ) : (
              <p className="text-neutral-500 text-sm mb-4 italic">No bio yet.</p>
            )}

            <div className="flex items-center justify-center md:justify-start gap-4 text-xs font-medium text-neutral-500 uppercase tracking-widest">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" /> 
                Joined {userData.createdAt ? new Date(userData.createdAt).getFullYear() : "2024"}
              </span>
              {userData.username && (
                <Link href={`/u/${userData.username}`} className="text-red-400 hover:text-red-300">
                  Public profile
                </Link>
              )}
            </div>
          </div>

<ProfileActions user={{ name: userData.name, bio: userData.bio, email: userData.email }} />

          <a
            href="/api/user/export"
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-medium text-neutral-300 transition hover:bg-white/10 hover:text-white"
          >
            <Download className="h-4 w-4" />
            Export data
          </a>
          
        </div>

<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-12">
           <StatCard icon={<Film className="w-5 h-5 text-blue-400" />} label="Titles Watched" value={watchedMovieIds.length.toString()} />
           <StatCard 
             icon={<Heart className="w-5 h-5 text-red-500" />} 
             label="Favorites" 
             value={userData.favorites.length.toString()} 
           />
           <StatCard icon={<List className="w-5 h-5 text-yellow-400" />} label="Lists Created" value={listsCreated.toString()} />
           <StatCard icon={<Bookmark className="w-5 h-5 text-blue-400" />} label="Watchlist" value={watchlist.length.toString()} />
           <StatCard icon={<Star className="w-5 h-5 text-yellow-400" />} label="Avg Stars" value={averageRating} />
           {userData.username ? (
             <Link href={`/u/${userData.username}/following`}>
               <StatCard icon={<UserIcon className="w-5 h-5 text-purple-400" />} label="Following" value={String(dbUser?.following?.length || 0)} />
             </Link>
           ) : (
             <StatCard icon={<UserIcon className="w-5 h-5 text-purple-400" />} label="Following" value={String(dbUser?.following?.length || 0)} />
           )}
           {userData.username ? (
             <Link href={`/u/${userData.username}/followers`}>
               <StatCard icon={<UserIcon className="w-5 h-5 text-purple-400" />} label="Followers" value={followerCount.toString()} />
             </Link>
           ) : (
             <StatCard icon={<UserIcon className="w-5 h-5 text-purple-400" />} label="Followers" value={followerCount.toString()} />
           )}
        </div>

<nav className="border-t border-white/10 pt-8 mb-8 flex flex-wrap gap-3 text-sm">
          {[
            ["Insights", "#insights"],
            ["Favorites", "#favorites"],
            ["Watched", "#watched"],
            ["Watchlist", "#watchlist"],
            ["Reviews", "#reviews"],
            ["Lists", "#lists"],
            ["Journal", "#journal"],
          ].map(([label, href]) => (
            <a key={href} href={href} className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-neutral-300 hover:text-white hover:border-red-500/40 transition">
              {label}
            </a>
          ))}
        </nav>

        <section id="insights" className="scroll-mt-24 pt-2">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            Insights
          </h3>
          <ProfileInsights insights={insights} byYear={byYear} years={years} community={community} />
        </section>

        <section id="favorites" className="scroll-mt-24 pt-2 mt-12">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500 fill-current" /> 
            Favorite Films
          </h3>

          {userData.favorites.length > 0 ? (
            <ProfileFavorites initialFavorites={userData.favorites} />
          ) : (
            <div className="h-64 rounded-2xl border border-dashed border-white/10 bg-white/5 flex flex-col items-center justify-center text-neutral-500 gap-4">
               <Film className="w-12 h-12 opacity-20" />
               <p>You have not added any favorites yet.</p>      
                <Link href="/" className="text-red-500 hover:text-red-400 text-sm hover:underline">
                    Browse Movies
                </Link>
            </div>
          )}
        </section>

        <section id="watched" className="scroll-mt-24 border-t border-white/10 pt-10 mt-12">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Film className="w-5 h-5 text-blue-400" />
            Recently Watched
          </h3>
          <ProfileMovieStrip items={journalEntries} emptyText="You have not marked any movies as watched yet." />
        </section>

        <section id="watchlist" className="scroll-mt-24 border-t border-white/10 pt-10 mt-12">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-blue-400" />
            Watchlist
          </h3>
          {watchlist.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
{watchlist.slice(0, 8).map((movie) => (
                <Link key={movie.movieId} href={movie.mediaType === "tv" ? `/tv/${movie.movieId}` : `/movie/${movie.movieId}`} className="bg-neutral-900/50 border border-white/10 rounded-xl overflow-hidden hover:border-red-500/40 transition">
                  <div className="relative aspect-2/3 bg-neutral-900">
                    {posterUrl(movie.posterPath) ? (
                      <Image
                        src={posterUrl(movie.posterPath) as string}
                        alt={movie.title}
                        fill
                        sizes="(min-width: 768px) 25vw, 50vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-neutral-700">
                        <Film className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState title="Your watchlist is empty" description="Add movies and shows you plan to watch." />
          )}
        </section>

<section id="reviews" className="scroll-mt-24 border-t border-white/10 pt-10 mt-12">
          <h3 className="text-xl font-bold mb-6">Your Reviews</h3>
          {reviews.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviews.map((review) => {
                const reviewRating = ownRatingMap.get(`${review.mediaType || "movie"}:${review.movieId}`) || 0;
                return (
                  <ReviewCard
                    key={review._id}
                    review={review}
                    rating={reviewRating}
                    currentUserEmail={currentUserEmail}
                    path="/profile"
                  />
                );
              })}
            </div>
          ) : (
            <EmptyState title="No reviews yet" description="You have not written any reviews yet." />
          )}
        </section>

        <section id="lists" className="scroll-mt-24 border-t border-white/10 pt-10 mt-12">
          <h3 className="text-xl font-bold mb-6">Your Lists</h3>
          {lists.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lists.map((list) => (
                <Link key={list._id} href={`/lists/${list._id}`} className="bg-neutral-900/50 border border-white/10 rounded-xl p-4 hover:border-red-500/40 transition">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="font-bold text-white truncate">{list.title}</h4>
                    <span className="text-xs text-neutral-400">{list.movies.length} films</span>
                  </div>
                  <p className="text-xs text-neutral-500 uppercase tracking-wider mt-2">{list.visibility}</p>
                  {list.description && <p className="text-sm text-neutral-300 mt-3 line-clamp-2">{list.description}</p>}
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState title="No lists yet" description="You have not created any lists yet." />
          )}
        </section>

        <section id="journal" className="scroll-mt-24 border-t border-white/10 pt-10 mt-12">
          <h3 className="text-xl font-bold mb-6">Journal Notes</h3>
          {journalEntries.length > 0 ? (
            <div className="space-y-3">
              {journalEntries.map((entry) => (
                <Link key={entry._id} href="/journal" className="block bg-neutral-900/50 border border-white/10 rounded-xl p-4 hover:border-red-500/40 transition">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="font-bold text-white">{entry.movieTitle}</h4>
                    <span className="text-xs text-neutral-500">{new Date(entry.watchedAt).toLocaleDateString(undefined, { timeZone: "UTC" })}</span>
                  </div>
                  {entry.note && <p className="text-sm text-neutral-300 mt-2 line-clamp-2">{entry.note}</p>}
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState title="Your journal is empty" description="Log your first watch to build your watch history." />
          )}
        </section>

      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="bg-neutral-900/50 border border-white/5 p-4 rounded-xl flex items-center gap-4 hover:bg-neutral-900 transition cursor-default">
       <div className="p-3 bg-white/5 rounded-full">{icon}</div>
       <div>
         <div className="text-2xl font-bold text-white">{value}</div>
         <div className="text-xs text-neutral-500 uppercase tracking-wider">{label}</div>
       </div>
    </div>
  );
}

function ProfileMovieStrip({ items, emptyText }: { items: JournalItem[]; emptyText: string }) {
  if (items.length === 0) {
    return <EmptyState title="No watches yet" description={emptyText} />;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((item) => {
        const hasTmdbId = Boolean(item.movieId);
        const card = (
          <>
            <div className="relative aspect-2/3 bg-neutral-900">
              {posterUrl(item.posterPath) ? (
                <Image
                  src={posterUrl(item.posterPath) as string}
                  alt={item.movieTitle}
                  fill
                  sizes="(min-width: 768px) 25vw, 50vw"
                  className="object-cover"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-neutral-700">
                  <Film className="w-8 h-8" />
                </div>
              )}
            </div>
            <div className="p-3">
              <h4 className="font-medium text-sm truncate">{item.movieTitle}</h4>
              <p className="text-xs text-neutral-500 mt-1">{new Date(item.watchedAt).toLocaleDateString(undefined, { timeZone: "UTC" })}</p>
            </div>
          </>
        );

        if (!hasTmdbId) {
          return (
            <div key={item._id} className="bg-neutral-900/50 border border-white/10 rounded-xl overflow-hidden">
              {card}
            </div>
          );
        }

        return (
          <Link
            key={item._id}
            href={item.mediaType === "tv" ? `/tv/${item.movieId}` : `/movie/${item.movieId}`}
            className="bg-neutral-900/50 border border-white/10 rounded-xl overflow-hidden"
          >
            {card}
          </Link>
        );
      })}
    </div>
  );
}

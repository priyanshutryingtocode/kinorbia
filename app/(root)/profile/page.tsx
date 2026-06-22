import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import { Film, Heart, List, Calendar, User as UserIcon } from "lucide-react";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import JournalEntry from "@/models/JournalEntry";
import MovieList from "@/models/MovieList";
import Review from "@/models/Review";
import ProfileActions from "@/components/profileActions";
import Link from "next/link";
import ProfileFavorites from "@/components/ProfileFavorites";
import type { FavoriteMovie, JournalItem, MovieListItem, ReviewItem } from "@/types";

type RawFavoriteMovie = FavoriteMovie & {
  _id?: { toString: () => string };
  addedAt?: Date;
};

type ProfileUser = {
  name?: string;
  bio?: string;
  email?: string;
  image?: string;
  createdAt?: Date;
  favorites?: RawFavoriteMovie[];
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
  }));
}

function serializeJournal(entry: RawJournalEntry): JournalItem {
  return {
    _id: entry._id.toString(),
    movieTitle: entry.movieTitle,
    posterPath: entry.posterPath,
    rating: entry.rating,
    watchedAt: entry.watchedAt.toISOString(),
    note: entry.note,
    createdAt: entry.createdAt.toISOString(),
  };
}

function serializeReview(review: RawReview): ReviewItem {
  return {
    _id: review._id.toString(),
    userEmail: review.userEmail,
    userName: review.userName,
    movieTitle: review.movieTitle,
    posterPath: review.posterPath,
    rating: review.rating,
    body: review.body,
    visibility: review.visibility || "public",
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
  const favorites = serializeFavorites(dbUser?.favorites);
  const [watchedMovieIds, listsCreated, rawJournalEntries, rawReviews, rawLists] = await Promise.all([
    JournalEntry.distinct("movieId", { userEmail: session.user.email }),
    MovieList.countDocuments({ userEmail: session.user.email }),
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
  ]);
  const journalEntries = rawJournalEntries.map(serializeJournal);
  const reviews = rawReviews.map(serializeReview);
  const lists = rawLists.map(serializeList);

  const userData = {
    name: dbUser?.name || session.user.name || "User",
    bio: dbUser?.bio || "",
    email: dbUser?.email || "",
    image: dbUser?.image || session.user.image,
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
            </div>
          </div>

          <ProfileActions user={{ name: userData.name, bio: userData.bio, email: userData.email }} />
          
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
           <StatCard icon={<Film className="w-5 h-5 text-blue-400" />} label="Movies Watched" value={watchedMovieIds.length.toString()} />
           <StatCard 
             icon={<Heart className="w-5 h-5 text-red-500" />} 
             label="Favorites" 
             value={userData.favorites.length.toString()} 
           />
           <StatCard icon={<List className="w-5 h-5 text-yellow-400" />} label="Lists Created" value={listsCreated.toString()} />
           <StatCard icon={<UserIcon className="w-5 h-5 text-purple-400" />} label="Following" value="0" />
        </div>

        <nav className="border-t border-white/10 pt-8 mb-8 flex flex-wrap gap-3 text-sm">
          {[
            ["Favorites", "#favorites"],
            ["Watched", "#watched"],
            ["Reviews", "#reviews"],
            ["Lists", "#lists"],
            ["Journal", "#journal"],
          ].map(([label, href]) => (
            <a key={href} href={href} className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-neutral-300 hover:text-white hover:border-red-500/40 transition">
              {label}
            </a>
          ))}
        </nav>

        <section id="favorites" className="pt-2">
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

        <section id="watched" className="border-t border-white/10 pt-10 mt-12">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Film className="w-5 h-5 text-blue-400" />
            Recently Watched
          </h3>
          <ProfileMovieStrip items={journalEntries} emptyText="You have not marked any movies as watched yet." />
        </section>

        <section id="reviews" className="border-t border-white/10 pt-10 mt-12">
          <h3 className="text-xl font-bold mb-6">Your Reviews</h3>
          {reviews.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviews.map((review) => (
                <Link key={review._id} href="/reviews" className="bg-neutral-900/50 border border-white/10 rounded-xl p-4 hover:border-red-500/40 transition">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <h4 className="font-bold text-white truncate">{review.movieTitle}</h4>
                    <span className="text-yellow-400 text-sm font-bold">{review.rating}/10</span>
                  </div>
                  <p className="text-xs text-neutral-500 uppercase tracking-wider mb-3">{review.visibility}</p>
                  <p className="text-sm text-neutral-300 line-clamp-3">{review.body}</p>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyPanel text="You have not written any reviews yet." />
          )}
        </section>

        <section id="lists" className="border-t border-white/10 pt-10 mt-12">
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
            <EmptyPanel text="You have not created any lists yet." />
          )}
        </section>

        <section id="journal" className="border-t border-white/10 pt-10 mt-12">
          <h3 className="text-xl font-bold mb-6">Journal Notes</h3>
          {journalEntries.length > 0 ? (
            <div className="space-y-3">
              {journalEntries.map((entry) => (
                <Link key={entry._id} href="/journal" className="block bg-neutral-900/50 border border-white/10 rounded-xl p-4 hover:border-red-500/40 transition">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="font-bold text-white">{entry.movieTitle}</h4>
                    <span className="text-xs text-neutral-500">{new Date(entry.watchedAt).toLocaleDateString()}</span>
                  </div>
                  {entry.note && <p className="text-sm text-neutral-300 mt-2 line-clamp-2">{entry.note}</p>}
                </Link>
              ))}
            </div>
          ) : (
            <EmptyPanel text="Your journal is empty." />
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
    return <EmptyPanel text={emptyText} />;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((item) => (
        <div key={item._id} className="bg-neutral-900/50 border border-white/10 rounded-xl overflow-hidden">
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
            <p className="text-xs text-neutral-500 mt-1">{new Date(item.watchedAt).toLocaleDateString()}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="border border-dashed border-white/10 rounded-xl p-8 text-center text-neutral-500">
      {text}
    </div>
  );
}

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import { Film, Heart, List, Calendar, User as UserIcon } from "lucide-react";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import JournalEntry from "@/models/JournalEntry";
import MovieList from "@/models/MovieList";
import ProfileActions from "@/components/profileActions";
import Link from "next/link";
import ProfileFavorites from "@/components/ProfileFavorites";
import type { FavoriteMovie } from "@/types";

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

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  await dbConnect();
  const dbUser = await User.findOne({ email: session.user.email }).lean<ProfileUser | null>();
  const favorites = serializeFavorites(dbUser?.favorites);
  const [watchedMovieIds, listsCreated] = await Promise.all([
    JournalEntry.distinct("movieId", { userEmail: session.user.email }),
    MovieList.countDocuments({ userEmail: session.user.email }),
  ]);

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

        <div className="border-t border-white/10 pt-10">
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
        </div>

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

import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import FavoriteButton from "@/components/FavouriteButton";
import { Calendar, Clock, Star } from "lucide-react";

async function getMovie(id: string) {
  const res = await fetch(
    `https://api.themoviedb.org/3/movie/${id}?api_key=${process.env.TMDB_API_KEY}`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) throw new Error("Movie not found");
  return res.json();
}

type Props = {
  params: Promise<{ id: string }>;
};

export default async function MoviePage({ params }: Props) {
  const { id } = await params;
  const movie = await getMovie(id);
  const session = await auth();

  // === DATABASE LOGIC START ===
  let isFavorite = false;
  if (session?.user?.email) {
    await dbConnect();
    const user = await User.findOne({ email: session.user.email });
    if (user?.favorites) {
      isFavorite = user.favorites.some((fav: any) => fav.movieId === id.toString());
    }
  }
  // === DATABASE LOGIC END ===

  const hours = Math.floor(movie.runtime / 60);
  const minutes = movie.runtime % 60;

  return (
    <div className="min-h-screen bg-neutral-950 text-white pb-20">
      {/* Backdrop */}
      <div
        className="absolute top-0 left-0 w-full h-[60vh] bg-cover bg-center opacity-30"
        style={{
          backgroundImage: `url(https://image.tmdb.org/t/p/original${movie.backdrop_path})`,
        }}
      >
        <div className="absolute inset-0 bg-linear-to-t from-neutral-950 via-neutral-950/20 to-transparent" />
      </div>

      {/* Content Container */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-32 flex flex-col md:flex-row gap-10">
        
        {/* Poster Image */}
        <div className="shrink-0">
          <img
            src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
            alt={movie.title}
            className="w-64 md:w-80 rounded-xl shadow-2xl border border-white/10 rotate-1 hover:rotate-0 transition-transform duration-500"
          />
        </div>

        {/* Text Content */}
        <div className="flex-1 mt-4">
          <h1 className="text-5xl font-bold tracking-tighter mb-2 text-white">
            {movie.title}
            <span className="text-neutral-500 font-normal ml-4 text-4xl">
              ({movie.release_date.split("-")[0]})
            </span>
          </h1>
          <p className="text-xl text-neutral-400 italic mb-6">{movie.tagline}</p>

          {/* Stats Row */}
          <div className="flex items-center gap-6 text-sm font-medium text-neutral-300 mb-8">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              <span>{movie.vote_average.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
              <Clock className="w-5 h-5 text-neutral-400" />
              <span>{hours}h {minutes}m</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
              <Calendar className="w-5 h-5 text-neutral-400" />
              <span>{movie.release_date}</span>
            </div>
          </div>

          {/* === BUTTONS SECTION === */}
          <div className="flex items-center gap-4 mb-8">
            {/* Just the Favorite Button now */}
            <div className="flex items-center gap-3">
               <span className="text-sm font-medium text-neutral-400 uppercase tracking-widest">Add to Favorites</span>
               <FavoriteButton 
                 movie={{
                   id: movie.id.toString(),
                   title: movie.title,
                   poster_path: movie.poster_path,
                   vote_average: movie.vote_average
                 }}
                 initialIsFavorite={isFavorite}
               />
            </div>
          </div>

          {/* Overview */}
          <h3 className="text-lg font-semibold mb-2 text-neutral-200">Overview</h3>
          <p className="text-neutral-400 leading-relaxed max-w-2xl text-lg">
            {movie.overview}
          </p>
        </div>
      </div>
    </div>
  );
}
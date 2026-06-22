import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import JournalEntry from "@/models/JournalEntry";
import FavoriteButton from "@/components/FavouriteButton";
import WatchedButton from "@/components/WatchedButton";
import MovieRatingControl from "@/components/MovieRatingControl";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Calendar, Clock, Star } from "lucide-react";
import type { FavoriteMovie, TmdbMovieDetails } from "@/types";

async function getMovie(id: string): Promise<TmdbMovieDetails> {
  const res = await fetch(
    `https://api.themoviedb.org/3/movie/${id}?api_key=${process.env.TMDB_API_KEY}`,
    { next: { revalidate: 3600 } }
  );

  if (res.status === 404) {
    notFound();
  }

  if (!res.ok) {
    throw new Error("Failed to load movie");
  }

  return res.json();
}

type Props = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function MoviePage({ params }: Props) {
  const { id } = await Promise.resolve(params);
  const movie = await getMovie(id);
  const session = await auth();

  let isFavorite = false;
  let isWatched = false;
  let personalRating = 0;
  if (session?.user?.email) {
    await dbConnect();
    const user = await User.findOne({ email: session.user.email }).lean<{
      favorites?: FavoriteMovie[];
    } | null>();

    if (user?.favorites) {
      const favorite = user.favorites.find((fav) => fav.movieId === id.toString());
      isFavorite = Boolean(favorite);
      personalRating = favorite?.personalRating || 0;
    }

    const journalEntry = await JournalEntry.findOne({
      userEmail: session.user.email,
      movieId: id.toString(),
    }).lean<{ rating?: number } | null>();

    isWatched = Boolean(journalEntry);
    personalRating = personalRating || journalEntry?.rating || 0;
  }

  const releaseYear = movie.release_date ? movie.release_date.split("-")[0] : "TBA";
  const runtime = typeof movie.runtime === "number" ? movie.runtime : 0;
  const hours = Math.floor(runtime / 60);
  const minutes = runtime % 60;
  const runtimeLabel = runtime > 0 ? `${hours}h ${minutes}m` : "Runtime TBA";
  const ratingLabel =
    typeof movie.vote_average === "number" ? movie.vote_average.toFixed(1) : "N/A";

  return (
    <div className="min-h-screen bg-neutral-950 text-white pb-20">
      <div className="absolute top-0 left-0 w-full h-[60vh] opacity-30">
        {movie.backdrop_path && (
          <Image
            src={`https://image.tmdb.org/t/p/original${movie.backdrop_path}`}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-neutral-950 via-neutral-950/20 to-transparent" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-32 flex flex-col md:flex-row gap-10">
        <div className="shrink-0">
          {movie.poster_path && (
            <Image
              src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
              alt={movie.title}
              width={320}
              height={480}
              priority
              className="w-64 md:w-80 rounded-xl shadow-2xl border border-white/10 rotate-1 hover:rotate-0 transition-transform duration-500"
            />
          )}
        </div>

        <div className="flex-1 mt-4">
          <h1 className="text-5xl font-bold tracking-tighter mb-2 text-white">
            {movie.title}
            <span className="text-neutral-500 font-normal ml-4 text-4xl">
              ({releaseYear})
            </span>
          </h1>
          {movie.tagline && (
            <p className="text-xl text-neutral-400 italic mb-6">{movie.tagline}</p>
          )}

          <div className="flex items-center gap-6 text-sm font-medium text-neutral-300 mb-8">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              <span>{ratingLabel}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
              <Clock className="w-5 h-5 text-neutral-400" />
              <span>{runtimeLabel}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
              <Calendar className="w-5 h-5 text-neutral-400" />
              <span>{movie.release_date || "Release date TBA"}</span>
            </div>
            {personalRating > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 rounded-lg border border-yellow-500/20 text-yellow-300">
                <Star className="w-5 h-5 fill-current" />
                <span>Your rating: {personalRating}/10</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-6 mb-8">
            <div className="flex items-center gap-3">
               <span className="text-sm font-medium text-neutral-400 uppercase tracking-widest">Add to Favorites</span>
               <FavoriteButton 
                 movie={{
                   id: movie.id.toString(),
                   title: movie.title,
                   poster_path: movie.poster_path,
                   vote_average: movie.vote_average || 0,
                   release_date: movie.release_date
                 }}
                 initialIsFavorite={isFavorite}
               />
            </div>

            <div className="flex items-center gap-3">
               <span className="text-sm font-medium text-neutral-400 uppercase tracking-widest">Mark Watched</span>
               <WatchedButton
                 movie={{
                   id: movie.id.toString(),
                   title: movie.title,
                   poster_path: movie.poster_path,
                 }}
                 initialIsWatched={isWatched}
               />
            </div>
          </div>

          <div className="mb-8">
            <MovieRatingControl
              movie={{
                id: movie.id.toString(),
                title: movie.title,
                poster_path: movie.poster_path,
                vote_average: movie.vote_average || 0,
                release_date: movie.release_date,
              }}
              initialRating={personalRating}
            />
          </div>

          <h3 className="text-lg font-semibold mb-2 text-neutral-200">Overview</h3>
          <p className="text-neutral-400 leading-relaxed max-w-2xl text-lg">
            {movie.overview || "No overview is available for this movie yet."}
          </p>
        </div>
      </div>
    </div>
  );
}

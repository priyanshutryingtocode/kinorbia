import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import JournalEntry from "@/models/JournalEntry";
import FavoriteButton from "@/components/FavouriteButton";
import WatchedButton from "@/components/WatchedButton";
import WatchlistButton from "@/components/WatchlistButton";
import MovieRatingControl from "@/components/MovieRatingControl";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Calendar, Clapperboard, Layers, Star } from "lucide-react";
import type { FavoriteMovie, TmdbTvCredits, TmdbTvDetails } from "@/types";
import SimilarShows from "@/components/SimilarShows";
import MovieReviewsAndLists from "@/components/MovieReviewsAndLists";
import { getTvWithStatus, getTvCredits } from "@/lib/tmdb";

async function getTvDetails(id: string): Promise<TmdbTvDetails> {
  const { tv, notFound: missing } = await getTvWithStatus(id);

  if (missing) {
    notFound();
  }

  if (!tv) {
    throw new Error("Failed to load show");
  }

  return tv;
}

async function getCredits(id: string): Promise<TmdbTvCredits> {
  const credits = await getTvCredits(id);
  return credits || { id: Number(id), cast: [], crew: [] };
}

type Props = {
  params: Promise<{ id: string }>;
};

export default async function TvPage({ params }: Props) {
  const { id } = await params;
  const [tv, credits] = await Promise.all([getTvDetails(id), getCredits(id)]);
  const session = await auth();

  let isFavorite = false;
  let isWatched = false;
  let isWatchlisted = false;
  let personalRating = 0;

  if (session?.user?.email) {
    await dbConnect();
    const user = await User.findOne({ email: session.user.email }).lean<{
      favorites?: FavoriteMovie[];
      watchlist?: FavoriteMovie[];
    } | null>();

    if (user?.favorites) {
      const favorite = user.favorites.find(
        (fav) => fav.movieId === id.toString() && (fav.mediaType || "movie") === "tv"
      );
      isFavorite = Boolean(favorite);
      personalRating = favorite?.personalRating || 0;
    }

    isWatchlisted = Boolean(
      user?.watchlist?.some(
        (item) => item.movieId === id.toString() && (item.mediaType || "movie") === "tv"
      )
    );

    const journalEntry = await JournalEntry.findOne({
      userEmail: session.user.email,
      movieId: id.toString(),
      mediaType: "tv",
    }).lean<{ rating?: number } | null>();

    isWatched = Boolean(journalEntry);
    personalRating = personalRating || journalEntry?.rating || 0;
  }

  const releaseYear = tv.first_air_date ? tv.first_air_date.split("-")[0] : "TBA";
  const ratingLabel =
    typeof tv.vote_average === "number" ? tv.vote_average.toFixed(1) : "N/A";

  const topCast = [...credits.cast].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).slice(0, 6);

  const show = {
    id: tv.id.toString(),
    title: tv.name,
    poster_path: tv.poster_path,
    vote_average: tv.vote_average || 0,
    release_date: tv.first_air_date,
    mediaType: "tv" as const,
  };

  return (
    <div className="relative min-h-screen overflow-hidden pb-20 text-white">
      <div className="absolute inset-x-0 top-0 h-[42vh] opacity-50 sm:h-[52vh]">
        {tv.backdrop_path && (
          <Image
            src={`https://image.tmdb.org/t/p/original${tv.backdrop_path}`}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-neutral-950 via-neutral-950/70 to-neutral-950/20" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 pt-28 sm:px-6 sm:pt-32">
        <div className="grid gap-8 lg:grid-cols-[minmax(260px,360px)_1fr] lg:gap-12">
          <div className="mx-auto w-full max-w-67.5 sm:max-w-82.5 lg:max-w-none">
            {tv.poster_path ? (
              <Image
                src={`https://image.tmdb.org/t/p/w500${tv.poster_path}`}
                alt={tv.name}
                width={320}
                height={480}
                priority
                className="aspect-2/3 w-full rotate-1 rounded-lg border border-white/10 object-cover shadow-[0_28px_80px_-44px_rgba(0,0,0,0.95)] transition-transform duration-500 hover:rotate-0"
              />
            ) : (
              <div className="flex aspect-2/3 w-full rotate-1 items-center justify-center rounded-lg border border-white/10 bg-neutral-900 shadow-[0_28px_80px_-44px_rgba(0,0,0,0.95)] transition-transform duration-500 hover:rotate-0">
                <Clapperboard className="h-10 w-10 text-neutral-700" />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <p className="mb-3 text-sm font-bold uppercase tracking-widest text-red-400">
              {releaseYear}
            </p>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight text-white sm:text-5xl">
              {tv.name}
            </h1>
            {tv.tagline && (
              <p className="mt-3 max-w-2xl text-base leading-7 text-neutral-400 sm:text-lg">
                {tv.tagline}
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-2 text-sm font-medium text-neutral-300">
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 backdrop-blur-md">
                <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                <span>{ratingLabel}</span>
              </div>
              {tv.number_of_seasons != null && (
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 backdrop-blur-md">
                  <Layers className="h-4 w-4 text-neutral-400" />
                  <span>{tv.number_of_seasons} {tv.number_of_seasons === 1 ? "season" : "seasons"}</span>
                </div>
              )}
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 backdrop-blur-md">
                <Calendar className="h-4 w-4 text-neutral-400" />
                <span>{tv.first_air_date || "Release date TBA"}</span>
              </div>
              {personalRating > 0 && (
                <div className="flex items-center gap-2 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1.5 text-yellow-300">
                  <Star className="h-4 w-4 fill-current" />
                  <span>Your {(personalRating / 2).toFixed(1)} stars</span>
                </div>
              )}
            </div>

            <div className="mt-8 rounded-lg border border-white/10 bg-neutral-950/70 p-4 backdrop-blur-xl sm:p-5">
              <div className="flex flex-wrap items-center gap-3">
                <FavoriteButton movie={show} initialIsFavorite={isFavorite} />
                <WatchedButton movie={show} initialIsWatched={isWatched} />
                <WatchlistButton movie={show} initialIsWatchlisted={isWatchlisted} />
                <div className="mt-3 w-full sm:mt-0 sm:w-auto sm:flex-1 sm:min-w-0">
                  <MovieRatingControl movie={show} initialRating={personalRating} />
                </div>
              </div>
            </div>

            <p className="mt-8 max-w-3xl text-base leading-8 text-neutral-300 sm:text-lg">
              {tv.overview || "No overview is available for this show yet."}
            </p>
          </div>
        </div>

        {topCast.length > 0 && (
          <section className="mt-14 border-t border-white/10 pt-8">
            <h2 className="mb-5 text-2xl font-bold">Top Cast</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {topCast.map((member) => (
                <div key={member.id} className="rounded-lg border border-white/10 bg-neutral-900/50 p-3 text-center">
                  {member.profile_path ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w185${member.profile_path}`}
                      alt={member.name}
                      width={120}
                      height={120}
                      className="mx-auto aspect-square rounded-full object-cover"
                    />
                  ) : (
                    <div className="mx-auto flex aspect-square w-30 items-center justify-center rounded-full bg-neutral-800">
                      <span className="text-3xl font-bold text-neutral-500">
                        {member.name.trim().charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <p className="mt-3 text-sm font-semibold text-white">{member.name}</p>
                  <p className="mt-1 text-xs text-neutral-400">
                    {member.character || "—"}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        <Suspense fallback={null}>
          <MovieReviewsAndLists movieId={id} mediaType="tv" />
        </Suspense>

        <Suspense fallback={null}>
          <SimilarShows showId={id} />
        </Suspense>
      </div>
    </div>
  );
}
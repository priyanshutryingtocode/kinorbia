import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import JournalEntry from "@/models/JournalEntry";
import MovieList from "@/models/MovieList";
import Review from "@/models/Review";
import FavoriteButton from "@/components/FavouriteButton";
import WatchedButton from "@/components/WatchedButton";
import WatchlistButton from "@/components/WatchlistButton";
import MovieRatingControl from "@/components/MovieRatingControl";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, Clock, Film, Star } from "lucide-react";
import type { FavoriteMovie, TmdbMovieCredits, TmdbMovieDetails } from "@/types";
import SimilarMovies from "@/components/SimilarMovies";

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

async function getCredits(id: string): Promise<TmdbMovieCredits> {
  const res = await fetch(
    `https://api.themoviedb.org/3/movie/${id}/credits?api_key=${process.env.TMDB_API_KEY}&language=en-US`,
    { next: { revalidate: 3600 } }
  );

  if (!res.ok) {
    return { id: Number(id), cast: [], crew: [] };
  }

  return res.json();
}

type Props = {
  params: Promise<{ id: string }>;
};

export default async function MoviePage({ params }: Props) {

  const { id } = await params;
  const [movie, credits] = await Promise.all([getMovie(id), getCredits(id)]);
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
      const favorite = user.favorites.find((fav) => fav.movieId === id.toString());
      isFavorite = Boolean(favorite);
      personalRating = favorite?.personalRating || 0;
    }

    isWatchlisted = Boolean(user?.watchlist?.some((item) => item.movieId === id.toString()));

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

  const directors = credits.crew.filter((member) => member.job === "Director");
  const producers = credits.crew.filter((member) => member.job === "Producer");
  const topCast = [...credits.cast].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).slice(0, 6);

  await dbConnect();
  const [publicReviews, publicLists] = await Promise.all([
    Review.find({ movieId: id.toString(), visibility: "public" })
      .sort({ createdAt: -1 })
      .limit(4)
      .lean<{
        _id: { toString: () => string };
        userName: string;
        rating: number;
        body: string;
        createdAt: Date;
      }[]>(),
    MovieList.find({ "movies.movieId": id.toString(), visibility: "public" })
      .sort({ createdAt: -1 })
      .limit(4)
      .lean<{
        _id: { toString: () => string };
        userName: string;
        title: string;
        description?: string;
        movies: unknown[];
      }[]>(),
  ]);

  return (
    <div className="relative min-h-screen overflow-hidden pb-20 text-white">
      <div className="absolute inset-x-0 top-0 h-[42vh] opacity-20 sm:h-[52vh]">
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
        <div className="absolute inset-0 bg-linear-to-t from-neutral-950 via-neutral-950/70 to-neutral-950/20" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 pt-28 sm:px-6 sm:pt-32">
        <div className="grid gap-8 lg:grid-cols-[minmax(260px,360px)_1fr] lg:gap-12">
          <div className="mx-auto w-full max-w-[270px] sm:max-w-[330px] lg:max-w-none">
            {movie.poster_path ? (
              <Image
                src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                alt={movie.title}
                width={320}
                height={480}
                priority
                className="aspect-2/3 w-full rotate-1 rounded-lg border border-white/10 object-cover shadow-[0_28px_80px_-44px_rgba(0,0,0,0.95)] transition-transform duration-500 hover:rotate-0"
              />
            ) : (
              <div className="flex aspect-2/3 w-full rotate-1 items-center justify-center rounded-lg border border-white/10 bg-neutral-900 shadow-[0_28px_80px_-44px_rgba(0,0,0,0.95)] transition-transform duration-500 hover:rotate-0">
                <Film className="h-10 w-10 text-neutral-700" />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <p className="mb-3 text-sm font-bold uppercase tracking-widest text-red-400">
              {releaseYear}
            </p>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight text-white sm:text-5xl">
              {movie.title}
            </h1>
            {movie.tagline && (
              <p className="mt-3 max-w-2xl text-base leading-7 text-neutral-400 sm:text-lg">
                {movie.tagline}
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-2 text-sm font-medium text-neutral-300">
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 backdrop-blur-md">
                <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                <span>{ratingLabel}</span>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 backdrop-blur-md">
                <Clock className="h-4 w-4 text-neutral-400" />
                <span>{runtimeLabel}</span>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 backdrop-blur-md">
                <Calendar className="h-4 w-4 text-neutral-400" />
                <span>{movie.release_date || "Release date TBA"}</span>
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
                <WatchedButton
                  movie={{
                    id: movie.id.toString(),
                    title: movie.title,
                    poster_path: movie.poster_path,
                  }}
                  initialIsWatched={isWatched}
                />
                <WatchlistButton
                  movie={{
                    id: movie.id.toString(),
                    title: movie.title,
                    poster_path: movie.poster_path,
                    vote_average: movie.vote_average || 0,
                    release_date: movie.release_date,
                  }}
                  initialIsWatchlisted={isWatchlisted}
                />
<div className="mt-3 w-full sm:mt-0 sm:w-auto sm:flex-1 sm:min-w-0">
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
              </div>
            </div>

            <p className="mt-8 max-w-3xl text-base leading-8 text-neutral-300 sm:text-lg">
              {movie.overview || "No overview is available for this movie yet."}
            </p>

            {(directors.length > 0 || producers.length > 0) && (
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {directors.length > 0 && (
                  <div className="rounded-lg border border-white/10 bg-neutral-900/50 p-4">
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-neutral-500">
                      Director{directors.length > 1 ? "s" : ""}
                    </h3>
                    <p className="text-base font-semibold text-white">
                      {directors.map((member) => member.name).join(", ")}
                    </p>
                  </div>
                )}
                {producers.length > 0 && (
                  <div className="rounded-lg border border-white/10 bg-neutral-900/50 p-4">
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-neutral-500">
                      Producer{producers.length > 1 ? "s" : ""}
                    </h3>
                    <p className="text-base font-semibold text-white">
                      {producers.map((member) => member.name).join(", ")}
                    </p>
                  </div>
                )}
              </div>
            )}
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
                    <div className="mx-auto flex aspect-square w-[120px] items-center justify-center rounded-full bg-neutral-800">
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

        {(publicReviews.length > 0 || publicLists.length > 0) && (
          <section className="mt-14 grid gap-6 border-t border-white/10 pt-8 lg:grid-cols-2">
            <div>
              <h2 className="mb-5 text-2xl font-bold">Reviews</h2>
              {publicReviews.length > 0 ? (
                <div className="space-y-3">
                  {publicReviews.map((review) => (
                    <article key={review._id.toString()} className="rounded-lg border border-white/10 bg-neutral-900/50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-neutral-400">by {review.userName}</p>
                        <span className="text-sm font-bold text-yellow-400">{(review.rating / 2).toFixed(1)} stars</span>
                      </div>
                      <p className="mt-3 line-clamp-4 text-sm leading-6 text-neutral-300">{review.body}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-neutral-500">No public reviews yet.</div>
              )}
            </div>

            <div>
              <h2 className="mb-5 text-2xl font-bold">In Lists</h2>
              {publicLists.length > 0 ? (
                <div className="space-y-3">
                  {publicLists.map((list) => (
                    <Link key={list._id.toString()} href={`/lists/${list._id}`} className="block rounded-lg border border-white/10 bg-neutral-900/50 p-4 transition hover:border-red-500/40">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-bold">{list.title}</h3>
                        <span className="text-xs text-neutral-500">{list.movies.length} films</span>
                      </div>
                      <p className="mt-1 text-xs text-neutral-500">by {list.userName}</p>
                      {list.description && <p className="mt-3 line-clamp-2 text-sm text-neutral-300">{list.description}</p>}
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-neutral-500">No public lists include this yet.</div>
              )}
            </div>
          </section>
        )}
        
        <SimilarMovies movieId={id} />
        
      </div>
    </div>
  );
}

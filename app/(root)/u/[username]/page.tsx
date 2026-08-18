import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, Film, Heart, List, MessageSquare, User as UserIcon } from "lucide-react";
import dbConnect from "@/lib/dbConnect";
import JournalEntry from "@/models/JournalEntry";
import MovieList from "@/models/MovieList";
import Review from "@/models/Review";
import User from "@/models/User";
import EmptyState from "@/components/EmptyState";
import { buildRatingMap, dedupeFavorites } from "@/lib/reviewRatings";
import type { FavoriteMovie, MediaType } from "@/types";

export const dynamic = "force-dynamic";

type PublicUser = {
  name?: string;
  bio?: string;
  email?: string;
  image?: string;
  username?: string;
  createdAt?: Date;
  favorites?: FavoriteMovie[];
};

function posterUrl(path?: string | null) {
  return path ? `https://image.tmdb.org/t/p/w185${path}` : null;
}

type PublicProfilePageProps = {
  params: Promise<{ username: string }> | { username: string };
};

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { username } = await Promise.resolve(params);
  await dbConnect();

  const user = await User.findOne({ username }).lean<PublicUser | null>();
  if (!user?.email) {
    notFound();
  }

  const [watchedCount, reviews, lists] = await Promise.all([
    JournalEntry.distinct("movieId", { userEmail: user.email }),
    Review.find({ userEmail: user.email, visibility: "public" }).sort({ createdAt: -1 }).limit(6).lean<{
      _id: { toString: () => string };
      movieTitle: string;
      movieId?: string;
      mediaType?: MediaType;
      body: string;
      createdAt: Date;
    }[]>(),
    MovieList.find({ userEmail: user.email, visibility: "public" }).sort({ createdAt: -1 }).limit(6).lean<{
      _id: { toString: () => string };
      title: string;
      description?: string;
      movies: FavoriteMovie[];
      createdAt: Date;
    }[]>(),
  ]);

  const favorites = dedupeFavorites(user.favorites || []);
  const ratingMap = buildRatingMap(favorites);

  return (
    <div className="min-h-screen px-6 py-12 text-white">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-lg border border-white/10 bg-neutral-950/70 p-6 backdrop-blur-xl">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
            <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-neutral-950 bg-neutral-900">
              {user.image ? (
                <Image src={user.image} alt={user.name || "Profile"} width={112} height={112} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-neutral-600">
                  <UserIcon className="h-12 w-12" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="mb-2 text-sm font-bold uppercase tracking-widest text-red-400">@{user.username}</p>
              <h1 className="text-4xl font-bold">{user.name || "KinOrbia user"}</h1>
              {user.bio && <p className="mt-3 max-w-2xl text-neutral-300">{user.bio}</p>}
              <p className="mt-4 flex items-center gap-2 text-xs uppercase tracking-widest text-neutral-500">
                <Calendar className="h-3 w-3" />
                Joined {user.createdAt ? new Date(user.createdAt).getFullYear() : "KinOrbia"}
              </p>
            </div>
          </div>
        </section>

        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat icon={<Film className="h-5 w-5 text-blue-400" />} label="Watched" value={watchedCount.length.toString()} />
          <Stat icon={<Heart className="h-5 w-5 text-red-400" />} label="Favorites" value={favorites.length.toString()} />
          <Stat icon={<MessageSquare className="h-5 w-5 text-green-400" />} label="Reviews" value={reviews.length.toString()} />
          <Stat icon={<List className="h-5 w-5 text-yellow-400" />} label="Lists" value={lists.length.toString()} />
        </div>

        <section className="mt-12">
          <h2 className="mb-5 text-xl font-bold">Favorite Films</h2>
          {favorites.length > 0 ? (
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
              {favorites.slice(0, 6).map((movie) => (
                <Link key={`${movie.mediaType || "movie"}-${movie.movieId}`} href={movie.mediaType === "tv" ? `/tv/${movie.movieId}` : `/movie/${movie.movieId}`} className="relative aspect-2/3 overflow-hidden rounded-lg border border-white/10 bg-neutral-900">
                  {posterUrl(movie.posterPath) ? (
                    <Image src={posterUrl(movie.posterPath) as string} alt={movie.title} fill sizes="150px" className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-neutral-700">
                      <Film className="h-6 w-6" />
                    </div>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState title="No public favorites yet" description="This user hasn't shared any favorites." />
          )}
        </section>

        <section className="mt-12 grid gap-6 md:grid-cols-2">
          <Panel title="Public Reviews">
            {reviews.length > 0 ? reviews.map((review) => {
              const reviewRating = ratingMap.get(`${review.mediaType || "movie"}:${review.movieId}`) || 0;
              return (
              <Link key={review._id.toString()} href="/reviews" className="block rounded-lg border border-white/10 bg-neutral-900/50 p-4 hover:border-red-500/40">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-bold">{review.movieTitle}</h3>
                  {reviewRating > 0 && (
                    <span className="text-sm font-bold text-yellow-400">{(reviewRating / 2).toFixed(1)} stars</span>
                  )}
                </div>
                <p className="mt-3 line-clamp-3 text-sm text-neutral-300">{review.body}</p>
              </Link>
              );
            }) : <EmptyState title="No public reviews yet" description="This user hasn't shared any reviews." />}
          </Panel>

          <Panel title="Public Lists">
            {lists.length > 0 ? lists.map((list) => (
              <Link key={list._id.toString()} href={`/lists/${list._id}`} className="block rounded-lg border border-white/10 bg-neutral-900/50 p-4 hover:border-red-500/40">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-bold">{list.title}</h3>
                  <span className="text-xs text-neutral-500">{list.movies.length} films</span>
                </div>
                {list.description && <p className="mt-3 line-clamp-2 text-sm text-neutral-300">{list.description}</p>}
              </Link>
            )) : <EmptyState title="No public lists yet" description="This user hasn't shared any lists." />}
          </Panel>
        </section>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-neutral-900/50 p-4">
      <div className="mb-3">{icon}</div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs uppercase tracking-widest text-neutral-500">{label}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-5 text-xl font-bold">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

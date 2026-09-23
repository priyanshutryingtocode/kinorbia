import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, Film, Heart, List, MessageSquare, User as UserIcon } from "lucide-react";
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import JournalEntry from "@/models/JournalEntry";
import MovieList from "@/models/MovieList";
import Review from "@/models/Review";
import User from "@/models/User";
import EmptyState from "@/components/EmptyState";
import FollowButton from "@/components/FollowButton";
import { buildRatingMap, dedupeFavorites } from "@/lib/reviewRatings";
import { mediaKey, tmdbImage } from "@/lib/media";
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
  following?: string[];
};

type PublicProfilePageProps = {
  params: Promise<{ username: string }> | { username: string };
};

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const username = (await Promise.resolve(params)).username.toLowerCase();
  const session = await auth();
  const currentEmail = session?.user?.email?.toLowerCase();

  await dbConnect();

  const user = await User.findOne({ username }).lean<PublicUser | null>();
  if (!user?.email) {
    notFound();
  }

  const [watchedCount, publicReviewCount, publicListCount, reviews, lists, followerCount, currentUser] = await Promise.all([
    JournalEntry.distinct("movieId", { userEmail: user.email }),
    Review.countDocuments({ userEmail: user.email, visibility: "public" }),
    MovieList.countDocuments({ userEmail: user.email, visibility: "public" }),
    Review.find({ userEmail: user.email, visibility: "public" }).sort({ createdAt: -1 }).limit(6).lean<{
      _id: { toString: () => string };
      movieTitle: string;
      movieId?: string;
      mediaType?: MediaType;
      body: string;
      spoiler?: boolean;
      createdAt: Date;
    }[]>(),
    MovieList.find({ userEmail: user.email, visibility: "public" }).sort({ createdAt: -1 }).limit(6).lean<{
      _id: { toString: () => string };
      title: string;
      description?: string;
      movies: FavoriteMovie[];
      createdAt: Date;
    }[]>(),
    User.countDocuments({ following: user.email }),
    currentEmail
      ? User.findOne({ email: currentEmail })
          .select("following")
          .lean<{ following: string[] } | null>()
      : Promise.resolve(null),
  ]);

  const favorites = dedupeFavorites(user.favorites || []);
  const ratingMap = buildRatingMap(favorites);
  const isSelf = currentEmail === user.email.toLowerCase();
  const isFollowing = Boolean(currentUser?.following?.includes(user.email.toLowerCase()));

  return (
    <div className="min-h-screen px-6 pt-24 pb-20 text-white">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <section className="premium-surface relative overflow-hidden rounded-panel p-8">
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              background:
                "radial-gradient(ellipse 60% 80% at 20% -10%, rgba(212,165,116,0.14), transparent 60%), radial-gradient(ellipse 50% 60% at 100% 0%, rgba(220,38,38,0.10), transparent 55%)",
            }}
          />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end">
            <div className="h-28 w-28 shrink-0 overflow-hidden rounded-full border-2 border-gold/40 bg-neutral-900 shadow-card">
              {user.image ? (
                <Image src={user.image} alt={user.name || "Profile"} width={112} height={112} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-neutral-600">
                  <UserIcon className="h-12 w-12" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-gold">
                @{user.username}
              </p>
              <h1 className="font-display text-4xl font-bold leading-[0.95] text-white md:text-5xl">
                {user.name || "KinOrbia user"}
              </h1>
              {user.bio && <p className="mt-3 max-w-2xl text-base leading-7 text-neutral-400">{user.bio}</p>}
              <div className="mt-4 h-px w-12 bg-gold/40" />
              <p className="mt-4 flex items-center gap-2 text-xs uppercase tracking-widest text-neutral-500">
                <Calendar className="h-3 w-3" />
                Joined {user.createdAt ? new Date(user.createdAt).getFullYear() : "KinOrbia"}
              </p>
            </div>
            {currentEmail && !isSelf && (
              <FollowButton
                targetEmail={user.email}
                isFollowing={isFollowing}
                path={`/u/${user.username}`}
              />
            )}
          </div>
        </section>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Stat icon={<Film className="h-5 w-5 text-blue-400" />} label="Watched" value={watchedCount.length.toString()} />
          <Stat icon={<Heart className="h-5 w-5 text-red-400" />} label="Favorites" value={favorites.length.toString()} />
          <Stat icon={<MessageSquare className="h-5 w-5 text-green-400" />} label="Reviews" value={publicReviewCount.toString()} />
          <Stat icon={<List className="h-5 w-5 text-yellow-400" />} label="Lists" value={publicListCount.toString()} />
          <Link href={`/u/${user.username}/following`} className="kin-focus group rounded-card">
            <Stat
              icon={<UserIcon className="h-5 w-5 text-purple-400" />}
              label="Following"
              value={String(user.following?.length || 0)}
              hoverable
            />
          </Link>
          <Link href={`/u/${user.username}/followers`} className="kin-focus group rounded-card">
            <Stat
              icon={<UserIcon className="h-5 w-5 text-purple-400" />}
              label="Followers"
              value={followerCount.toString()}
              hoverable
            />
          </Link>
        </div>

        {/* Favorite films */}
        <section className="mt-14">
          <SectionHeading eyebrow="Curated" title="Favorite Films" />
          {favorites.length > 0 ? (
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
              {favorites.slice(0, 6).map((movie) => (
                <Link
                  key={mediaKey(movie.mediaType, movie.movieId)}
                  href={movie.mediaType === "tv" ? `/tv/${movie.movieId}` : `/movie/${movie.movieId}`}
                  className="kin-focus group relative block aspect-2/3 overflow-hidden rounded-lg border border-white/10 bg-neutral-950 shadow-card transition-all hover:-translate-y-1 hover:border-white/18 hover:shadow-card-hover"
                >
                  {tmdbImage(movie.posterPath, "w185") ? (
                    <Image
                      src={tmdbImage(movie.posterPath, "w185") as string}
                      alt={movie.title}
                      fill
                      sizes="150px"
                      className="object-cover transition duration-500 group-hover:scale-[1.04] group-hover:saturate-110"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-neutral-700">
                      <Film className="h-6 w-6" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState title="No public favorites yet" description="This user hasn't shared any favorites." />
          )}
        </section>

        {/* Reviews & Lists */}
        <section className="mt-14 grid gap-8 md:grid-cols-2">
          <Panel eyebrow="From the archive" title="Public Reviews">
            {reviews.length > 0 ? reviews.map((review) => {
              const reviewRating = ratingMap.get(mediaKey(review.mediaType, review.movieId)) || 0;
              return (
                <Link
                  key={review._id.toString()}
                  href="/reviews"
                  className="kin-focus premium-card group block rounded-card p-4 hover:border-gold/30 hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-display text-lg font-semibold text-white">{review.movieTitle}</h3>
                    {reviewRating > 0 && (
                      <span className="shrink-0 text-sm font-bold text-gold">{(reviewRating / 2).toFixed(1)} ★</span>
                    )}
                  </div>
                  {review.spoiler && (
                    <span className="mt-2 inline-flex rounded-full border border-yellow-500/20 bg-yellow-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-yellow-300">
                      Spoiler
                    </span>
                  )}
                  <p className={`mt-3 line-clamp-3 text-sm leading-6 text-neutral-400 ${review.spoiler ? "select-none opacity-40 blur-sm" : ""}`}>
                    {review.body}
                  </p>
                </Link>
              );
            }) : <EmptyState title="No public reviews yet" description="This user hasn't shared any reviews." />}
          </Panel>

          <Panel eyebrow="Worth a watch" title="Public Lists">
            {lists.length > 0 ? lists.map((list) => (
              <Link
                key={list._id.toString()}
                href={`/lists/${list._id}`}
                className="kin-focus premium-card group block rounded-card p-4 hover:border-gold/30 hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-display text-lg font-semibold text-white">{list.title}</h3>
                  <span className="shrink-0 text-xs uppercase tracking-widest text-neutral-500">{list.movies.length} films</span>
                </div>
                {list.description && <p className="mt-3 line-clamp-2 text-sm leading-6 text-neutral-400">{list.description}</p>}
              </Link>
            )) : <EmptyState title="No public lists yet" description="This user hasn't shared any lists." />}
          </Panel>
        </section>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, hoverable = false }: { icon: React.ReactNode; label: string; value: string; hoverable?: boolean }) {
  return (
    <div className={`premium-card rounded-card p-4 ${hoverable ? "group-hover:border-gold/30 group-hover:-translate-y-0.5" : ""}`}>
      <div className="mb-3">{icon}</div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs uppercase tracking-widest text-neutral-500">{label}</p>
    </div>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-6 flex flex-col gap-2">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">{eyebrow}</p>
      <h2 className="font-display text-2xl font-bold leading-tight text-white md:text-3xl">{title}</h2>
    </div>
  );
}

function Panel({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section>
      <SectionHeading eyebrow={eyebrow} title={title} />
      <div className="space-y-3">{children}</div>
    </section>
  );
}
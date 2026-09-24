import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Heart, List, MessageSquare, User as UserIcon } from "lucide-react";
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import MovieList from "@/models/MovieList";
import Review from "@/models/Review";
import User from "@/models/User";
import EmptyState from "@/components/EmptyState";
import FollowButton from "@/components/FollowButton";
import ProfileHeader from "@/components/ProfileHeader";
import ProfilePanel from "@/components/ProfilePanel";
import SpoilerText from "@/components/SpoilerText";
import StatCard from "@/components/StatCard";
import { mediaKey, normalizeMediaType, tmdbImage } from "@/lib/media";
import { dedupeFavorites } from "@/lib/reviewRatings";
import type { FavoriteMovie, MediaType } from "@/types";

export const dynamic = "force-dynamic";

type PublicProfileUser = {
  _id: { toString: () => string };
  name: string;
  email: string;
  bio?: string;
  image?: string;
  username?: string;
  createdAt?: Date;
  following?: string[];
};

type PublicReview = {
  _id: { toString: () => string };
  movieTitle: string;
  movieId?: string;
  mediaType?: MediaType;
  body: string;
  spoiler?: boolean;
  createdAt: Date;
};

type PublicList = {
  _id: { toString: () => string };
  title: string;
  description?: string;
  movieCount: number;
  createdAt: Date;
};

type PublicProfilePageProps = {
  params: Promise<{ username: string }>;
};

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { username: rawUsername } = await params;
  const username = rawUsername.toLowerCase();
  const session = await auth();
  const currentEmail = session?.user?.email?.toLowerCase();

  await dbConnect();
  const user = await User.findOne({ username })
    .select("_id name email bio image username createdAt following")
    .lean<PublicProfileUser | null>();

  if (!user?.email) {
    notFound();
  }

  const targetEmail = user.email.toLowerCase();
  const followingEmails = [...new Set((user.following || []).map((email) => email.toLowerCase()))];
  const [
    ratingRows,
    publicReviewCount,
    publicListCount,
    reviews,
    lists,
    followerCount,
    followingCount,
    currentUser,
  ] = await Promise.all([
    User.findOne({ email: targetEmail })
      .select("favorites")
      .lean<{ favorites?: FavoriteMovie[] } | null>(),
    Review.countDocuments({ userEmail: targetEmail, visibility: "public" }),
    MovieList.countDocuments({ userEmail: targetEmail, visibility: "public" }),
    Review.find({ userEmail: targetEmail, visibility: "public" })
      .select("_id movieTitle movieId mediaType body spoiler createdAt")
      .sort({ createdAt: -1, _id: -1 })
      .limit(6)
      .lean<PublicReview[]>(),
    MovieList.aggregate<PublicList>([
      { $match: { userEmail: targetEmail, visibility: "public" } },
      { $sort: { createdAt: -1, _id: -1 } },
      { $limit: 6 },
      { $project: { title: 1, description: 1, createdAt: 1, movieCount: { $size: { $ifNull: ["$movies", []] } } } },
    ]),
    User.countDocuments({ following: targetEmail }),
    followingEmails.length ? User.countDocuments({ email: { $in: followingEmails } }) : Promise.resolve(0),
    currentEmail
      ? User.findOne({ email: currentEmail }).select("following").lean<{ following?: string[] } | null>()
      : Promise.resolve(null),
  ]);

  const allFavorites = dedupeFavorites(ratingRows?.favorites || []);
  const favorites = allFavorites.slice(0, 6);
  const ratingMap = new Map(
    allFavorites.map((favorite) => [mediaKey(favorite.mediaType, favorite.movieId), favorite.personalRating || 0])
  );
  const isSelf = currentEmail === targetEmail;
  const isFollowing = Boolean(currentUser?.following?.some((email) => email.toLowerCase() === targetEmail));

  return (
    <div className="min-h-screen px-4 pb-20 pt-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <ProfileHeader
          name={user.name || "KinOrbia user"}
          username={user.username}
          bio={user.bio}
          image={user.image}
          createdAt={user.createdAt}
          followers={followerCount}
          following={followingCount}
        >
          {!isSelf && currentEmail && (
            <FollowButton
              targetUserId={user._id.toString()}
              targetName={user.name}
              isFollowing={isFollowing}
              path={`/u/${username}`}
            />
          )}
          {!currentEmail && (
            <Link href="/login" className="kin-focus inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-500">
              Sign in to follow
            </Link>
          )}
          {isSelf && <Link href="/profile" className="kin-focus inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-semibold text-neutral-200 transition hover:border-gold/30 hover:text-white">Edit your profile</Link>}
        </ProfileHeader>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard icon={<Heart className="h-5 w-5 text-red-300" />} label="Favorites" value={allFavorites.length.toString()} emphasis="red" />
          <StatCard icon={<MessageSquare className="h-5 w-5 text-emerald-300" />} label="Public reviews" value={publicReviewCount.toString()} />
          <StatCard icon={<List className="h-5 w-5 text-yellow-300" />} label="Public lists" value={publicListCount.toString()} emphasis="gold" />
          <StatCard icon={<UserIcon className="h-5 w-5 text-blue-300" />} label="Followers" value={followerCount.toString()} href={`/u/${username}/followers`} />
          <StatCard icon={<UserIcon className="h-5 w-5 text-purple-300" />} label="Following" value={followingCount.toString()} href={`/u/${username}/following`} />
        </div>

        <div className="mt-12 space-y-12">
          <ProfilePanel id="favorites" eyebrow="Curated" title="Favorite films and shows" description={`${allFavorites.length} titles selected by ${user.name || "this member"}.`}>
            {favorites.length ? (
              <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
                {favorites.map((movie) => (
                  <Link
                    key={mediaKey(movie.mediaType, movie.movieId)}
                    href={normalizeMediaType(movie.mediaType) === "tv" ? `/tv/${movie.movieId}` : `/movie/${movie.movieId}`}
                    className="kin-focus group relative block aspect-2/3 overflow-hidden rounded-card border border-white/10 bg-neutral-950 shadow-card transition hover:-translate-y-0.5 hover:border-gold/30"
                    aria-label={`${movie.title} (${normalizeMediaType(movie.mediaType) === "tv" ? "TV show" : "movie"})`}
                  >
                    {tmdbImage(movie.posterPath, "w342") ? (
                      <Image src={tmdbImage(movie.posterPath, "w342") as string} alt="" fill sizes="(min-width: 768px) 16vw, 30vw" className="object-cover transition duration-500 group-hover:scale-[1.03]" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-neutral-700"><UserIcon className="h-8 w-8" /></div>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState title="No favorites yet" description="This member has not added any public favorites." />
            )}
          </ProfilePanel>

          <div className="grid gap-10 xl:grid-cols-2">
            <ProfilePanel id="reviews" eyebrow="From the archive" title="Public reviews">
              <div className="space-y-3">
                {reviews.length ? reviews.map((review) => {
                  const mediaType = normalizeMediaType(review.mediaType);
                  const href = review.movieId ? (mediaType === "tv" ? `/tv/${review.movieId}` : `/movie/${review.movieId}`) : "/reviews";
                  const rating = ratingMap.get(mediaKey(review.mediaType, review.movieId)) || 0;
                  return (
                    <article key={review._id.toString()} className="premium-card rounded-card p-5">
                      <div className="flex items-start justify-between gap-3">
                        <h3>
                          <Link href={href} className="kin-focus rounded-sm font-display text-lg font-semibold text-white transition hover:text-gold">{review.movieTitle}</Link>
                        </h3>
                        {rating > 0 && <span className="shrink-0 text-sm font-bold text-gold">{(rating / 2).toFixed(1)} ★</span>}
                      </div>
                      {review.spoiler ? <SpoilerText text={review.body} /> : <p className="mt-3 line-clamp-4 text-sm leading-6 text-neutral-400">{review.body}</p>}
                    </article>
                  );
                }) : <EmptyState title="No public reviews yet" description="This member has not shared any reviews." />}
              </div>
            </ProfilePanel>

            <ProfilePanel id="lists" eyebrow="Worth a watch" title="Public lists">
              <div className="space-y-3">
                {lists.length ? lists.map((list) => (
                  <Link key={list._id.toString()} href={`/lists/${list._id}`} className="kin-focus premium-card group block rounded-card p-5 transition hover:-translate-y-0.5 hover:border-gold/30">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display text-lg font-semibold text-white group-hover:text-gold">{list.title}</h3>
                      <span className="shrink-0 text-xs text-neutral-500">{list.movieCount} titles</span>
                    </div>
                    {list.description && <p className="mt-3 line-clamp-3 text-sm leading-6 text-neutral-400">{list.description}</p>}
                  </Link>
                )) : <EmptyState title="No public lists yet" description="This member has not shared any lists." />}
              </div>
            </ProfilePanel>
          </div>
        </div>
      </div>
    </div>
  );
}

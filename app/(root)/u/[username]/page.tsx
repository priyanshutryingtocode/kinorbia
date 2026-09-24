import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { User as UserIcon } from "lucide-react";
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import MovieList from "@/models/MovieList";
import Review from "@/models/Review";
import User from "@/models/User";
import EmptyState from "@/components/EmptyState";
import FollowButton from "@/components/FollowButton";
import ProfileHeader from "@/components/ProfileHeader";
import ProfileMetricRail from "@/components/ProfileMetricRail";
import ProfilePanel from "@/components/ProfilePanel";
import SpoilerText from "@/components/SpoilerText";
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
    <div className="min-h-screen px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
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
            <Link
              href="/login"
              className="kin-focus inline-flex items-center rounded-sm bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-500"
            >
              Sign in to follow
            </Link>
          )}
          {isSelf && (
            <Link
              href="/profile"
              className="kin-focus inline-flex items-center rounded-sm border border-white/10 px-3 py-1.5 text-xs font-semibold text-neutral-300 transition-colors hover:border-gold/40 hover:text-white"
            >
              Edit your profile
            </Link>
          )}
        </ProfileHeader>

        <ProfileMetricRail
          ariaLabel="Public profile metrics"
          className="mt-6"
          metrics={[
            { label: "Favorites", value: allFavorites.length, emphasis: "red" },
            { label: "Public reviews", value: publicReviewCount, emphasis: "neutral" },
            { label: "Public lists", value: publicListCount, emphasis: "gold" },
          ]}
        />

        <div className="mt-10 space-y-10">
          <ProfilePanel
            id="favorites"
            eyebrow="Curated"
            title="Favorite films and shows"
            description={favorites.length < allFavorites.length ? `Showing ${favorites.length} of ${allFavorites.length} titles.` : "A considered selection of movies and shows."}
          >
            {favorites.length ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-6">
                {favorites.map((movie) => (
                  <Link
                    key={mediaKey(movie.mediaType, movie.movieId)}
                    href={normalizeMediaType(movie.mediaType) === "tv" ? `/tv/${movie.movieId}` : `/movie/${movie.movieId}`}
                    className="kin-focus group relative block aspect-2/3 overflow-hidden rounded-sm border border-white/10 bg-neutral-950 transition-colors hover:border-gold/40"
                    aria-label={`${movie.title} (${normalizeMediaType(movie.mediaType) === "tv" ? "TV show" : "movie"})`}
                  >
                    {tmdbImage(movie.posterPath, "w342") ? (
                      <Image
                        src={tmdbImage(movie.posterPath, "w342") as string}
                        alt=""
                        fill
                        sizes="(min-width: 768px) 16vw, 30vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-neutral-700">
                        <UserIcon className="h-8 w-8" />
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState compact title="No favorites yet" description="This member has not added any public favorites." />
            )}
          </ProfilePanel>

          <div className="grid gap-8 xl:grid-cols-2">
            <ProfilePanel
              id="reviews"
              eyebrow="From the archive"
              title="Recent public reviews"
              description={reviews.length < publicReviewCount ? `Showing ${reviews.length} of ${publicReviewCount} public reviews.` : undefined}
            >
              {reviews.length ? (
                <div className="border-y border-white/10">
                  {reviews.map((review) => {
                    const mediaType = normalizeMediaType(review.mediaType);
                    const href = review.movieId
                      ? mediaType === "tv"
                        ? `/tv/${review.movieId}`
                        : `/movie/${review.movieId}`
                      : "/reviews";
                    const rating = ratingMap.get(mediaKey(review.mediaType, review.movieId)) || 0;
                    return (
                      <article
                        key={review._id.toString()}
                        className="border-b border-white/10 py-4 last:border-b-0"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h3>
                            <Link
                              href={href}
                              className="kin-focus rounded-sm font-display text-base font-medium text-white transition-colors hover:text-gold"
                            >
                              {review.movieTitle}
                            </Link>
                          </h3>
                          {rating > 0 && (
                            <span className="shrink-0 text-sm font-semibold text-gold">
                              {(rating / 2).toFixed(1)} ★
                            </span>
                          )}
                        </div>
                        {review.spoiler ? (
                          <SpoilerText text={review.body} />
                        ) : (
                          <p className="mt-2 line-clamp-4 text-sm leading-6 text-neutral-400">
                            {review.body}
                          </p>
                        )}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <EmptyState compact title="No public reviews yet" description="This member has not shared any reviews." />
              )}
            </ProfilePanel>

            <ProfilePanel
              id="lists"
              eyebrow="Worth a watch"
              title="Recent public lists"
              description={lists.length < publicListCount ? `Showing ${lists.length} of ${publicListCount} public lists.` : undefined}
            >
              {lists.length ? (
                <div className="border-y border-white/10">
                  {lists.map((list) => (
                    <Link
                      key={list._id.toString()}
                      href={`/lists/${list._id}`}
                      className="kin-focus group block border-b border-white/10 py-4 transition-colors last:border-b-0 hover:bg-neutral-900/30"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-display text-base font-medium text-white group-hover:text-gold">
                          {list.title}
                        </h3>
                        <span className="shrink-0 text-xs text-neutral-400">
                          {list.movieCount} titles
                        </span>
                      </div>
                      {list.description && (
                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-neutral-400">
                          {list.description}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState compact title="No public lists yet" description="This member has not shared any lists." />
              )}
            </ProfilePanel>
          </div>
        </div>
      </div>
    </div>
  );
}

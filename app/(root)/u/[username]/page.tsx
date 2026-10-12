import PosterImage from "@/components/PosterImage";
import RouteShell from "@/components/RouteShell";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import EmptyState from "@/components/EmptyState";
import FollowButton from "@/components/FollowButton";
import ProfileHeader from "@/components/ProfileHeader";
import ProfileMetricRail from "@/components/ProfileMetricRail";
import ProfilePanel from "@/components/ProfilePanel";
import SpoilerText from "@/components/SpoilerText";
import { renderRichText } from "@/lib/renderRichText";
import { mediaHref, mediaKey, normalizeMediaType, starsLabel } from "@/lib/media";
import { getPublicProfileData } from "@/features/profile/queries";

export const dynamic = "force-dynamic";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username: rawUsername } = await params;
  const username = rawUsername.toLowerCase();
  const session = await auth();
  const currentEmail = session?.user?.email?.toLowerCase();

  const data = await getPublicProfileData({ username, currentEmail });

  if (!data) {
    notFound();
  }

  const {
    user,
    favorites,
    favoriteCount,
    ratingMap,
    publicReviewCount,
    publicListCount,
    reviews,
    lists,
    followerCount,
    followingCount,
    isFollowing,
  } = data;

  const isSelf = currentEmail === user.email;

  return (
    <RouteShell spacing="extended" width="frame">
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
            className="kin-focus inline-flex items-center rounded-sm bg-accent px-3 py-1.5 text-xs font-semibold text-on-accent transition-colors hover:bg-accent-hover"
          >
            Sign in to follow
          </Link>
        )}
        {isSelf && (
          <Link
            href="/profile"
            className="kin-focus inline-flex items-center rounded-sm border border-rule px-3 py-1.5 text-xs font-semibold text-content transition-colors hover:border-highlight/40 hover:text-content"
          >
            Edit your profile
          </Link>
        )}
      </ProfileHeader>

      <ProfileMetricRail
        ariaLabel="Public profile metrics"
        className="mt-6"
        metrics={[
          { label: "Favorites", value: favoriteCount, emphasis: "red" },
          { label: "Public reviews", value: publicReviewCount, emphasis: "neutral" },
          { label: "Public lists", value: publicListCount, emphasis: "gold" },
        ]}
      />

      <div className="mt-10 space-y-10">
        <ProfilePanel
          id="favorites"
          eyebrow="Curated"
          title="Favorite films and shows"
          description={favorites.length < favoriteCount ? `Showing ${favorites.length} of ${favoriteCount} titles.` : "A considered selection of movies and shows."}
        >
          {favorites.length ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-6">
              {favorites.map((movie) => {
                return (
                  <Link
                    key={mediaKey(movie.mediaType, movie.movieId)}
                    href={mediaHref(movie.mediaType, movie.movieId)}
                    className="kin-focus group relative block aspect-2/3 overflow-hidden rounded-sm border border-rule bg-canvas transition-colors hover:border-highlight/40"
                    aria-label={`${movie.title} (${normalizeMediaType(movie.mediaType) === "tv" ? "TV show" : "movie"})`}
                  >
                    {/* The fallback here was a UserIcon -- a person glyph where
                        a film poster belongs -- and it carried no aria-hidden,
                        unlike every other site. */}
                    <PosterImage
                      path={movie.posterPath}
                      width="w342"
                      alt=""
                      sizes="(min-width: 768px) 16vw, 30vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  </Link>
                );
              })}
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
              <div className="border-y border-rule">
                {reviews.map((review) => {
                  const mediaType = normalizeMediaType(review.mediaType);
                  const href = review.movieId ? mediaHref(mediaType, review.movieId) : "/reviews";
                  const rating = ratingMap.get(mediaKey(review.mediaType, review.movieId)) || 0;
                  return (
                    <article
                      key={review._id.toString()}
                      className="border-b border-rule py-4 last:border-b-0"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3>
                          <Link
                            href={href}
                            className="kin-focus rounded-sm font-display text-base font-medium text-content transition-colors hover:text-highlight"
                          >
                            {review.title}
                          </Link>
                        </h3>
                        {rating > 0 && (
                          <span className="shrink-0 text-sm font-semibold text-highlight">
                            {starsLabel(rating)} ★
                          </span>
                        )}
                      </div>
                      {review.spoiler ? (
                        <SpoilerText text={review.body} />
                      ) : (
                        // renderRichText, matching the review cards and the
                        // activity feed rather than printing markdown source.
                        <div className="mt-2 line-clamp-4 text-sm leading-6 text-content-muted">
                          {renderRichText(review.body)}
                        </div>
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
              <div className="border-y border-rule">
                {lists.map((list) => (
                  <Link
                    key={list._id.toString()}
                    href={`/lists/${list._id}`}
                    className="kin-focus group block border-b border-rule py-4 transition-colors last:border-b-0 hover:bg-surface-raised/30"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display text-base font-medium text-content group-hover:text-highlight">
                        {list.title}
                      </h3>
                      <span className="shrink-0 text-xs text-content-muted">
                        {list.movieCount} titles
                      </span>
                    </div>
                    {list.description && (
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-content-muted">
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
    </RouteShell>
  );
}

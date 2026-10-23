import Link from "next/link";
import {Star} from "lucide-react";
import PosterImage from "@/components/PosterImage";

import { renderRichText } from "@/lib/renderRichText";
import { formatDate, mediaHref, starsLabel } from "@/lib/media";
import { usernameFor } from "@/lib/profileLinks";
import type { ReviewItem } from "@/types";
import ManageReviewForm from "./ManageReviewForm";
import SocialActionButton from "./SocialActionButton";
import SpoilerText from "./SpoilerText";
import UserNameLink from "./UserNameLink";
import VisibilityBadge from "./VisibilityBadge";

const NO_USERNAMES = new Map<string, string>();

type ReviewCardProps = {
  review: ReviewItem;
  rating?: number;
  currentUserEmail: string;
  path: string;
  usernames?: Map<string, string>;
};

export default function ReviewCard({
  review,
  rating = 0,
  currentUserEmail,
  path,
  usernames,
}: ReviewCardProps) {
  const viewerEmail = currentUserEmail.toLowerCase();
  const body = review.spoiler ? (
    <SpoilerText text={review.body} />
  ) : (
    <div className="line-clamp-4 whitespace-pre-wrap wrap-break-word text-xs leading-5 text-content-muted">
      {renderRichText(review.body)}
    </div>
  );

  const title = review.movieId ? (
    <Link
      href={mediaHref(review.mediaType, review.movieId)}
      title={review.title}
      className="kin-focus line-clamp-2 wrap-break-word transition-colors hover:text-highlight"
    >
      {review.title}
    </Link>
  ) : (
    <span className="line-clamp-2 wrap-break-word">{review.title}</span>
  );

  return (
    <article className="flex h-full min-w-0 overflow-hidden rounded-sheet border border-rule bg-surface/65 transition-colors hover:border-rule-strong">
      <div className="relative h-full w-32 shrink-0 bg-surface-raised sm:w-40">
        <PosterImage
          path={review.posterPath}
          width="w342"
          alt={review.title}
          sizes="(min-width: 640px) 160px, 128px"
          className="object-contain"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 font-display text-base font-medium leading-tight text-content">
            {title}
          </h3>
          <VisibilityBadge visibility={review.visibility} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-content-subtle">
          <span>
            By{" "}
            <UserNameLink
              userName={review.userName}
              username={usernameFor(usernames ?? NO_USERNAMES, review.userEmail)}
            />
          </span>
          <span aria-hidden="true">·</span>
          <time dateTime={review.createdAt}>{formatDate(review.createdAt)}</time>
          {rating > 0 && (
            <span className="inline-flex items-center gap-1 font-semibold text-highlight" aria-label={`${rating} out of 10`}>
              <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
              {starsLabel(rating)}
            </span>
          )}
        </div>
        <div className="mt-3">{body}</div>
        {review.visibility === "public" && (
          <div className="mt-auto flex flex-wrap gap-2 pt-4">
            <SocialActionButton
              type="review"
              id={review._id}
              action="like"
              count={review.likedBy?.length || 0}
              active={Boolean(review.likedBy?.includes(viewerEmail))}
              path={path}
            />
            <SocialActionButton
              type="review"
              id={review._id}
              action="save"
              count={review.savedBy?.length || 0}
              active={Boolean(review.savedBy?.includes(viewerEmail))}
              path={path}
            />
          </div>
        )}
        {review.userEmail.toLowerCase() === viewerEmail && <ManageReviewForm review={review} />}
      </div>
    </article>
  );
}
import {Star} from "lucide-react";
import PosterImage from "@/components/PosterImage";

import { renderRichText } from "@/lib/renderRichText";
import { starsLabel } from "@/lib/media";
import { usernameFor } from "@/lib/profileLinks";
import type { ReviewItem } from "@/types";
import ManageReviewForm from "./ManageReviewForm";
import SocialActionButton from "./SocialActionButton";
import SpoilerText from "./SpoilerText";
import UserNameLink from "./UserNameLink";
import VisibilityBadge from "./VisibilityBadge";

// Shared empty map so the optional `usernames` prop does not allocate a new Map
// on every render of every card in the grid.
const NO_USERNAMES = new Map<string, string>();

type ReviewCardProps = {
  review: ReviewItem;
  rating?: number;
  currentUserEmail: string;
  path: string;
  // email -> username, resolved once by the page that owns this list. The card
  // itself never queries: it is rendered inside grids and repeated per review.
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
    <div className="whitespace-pre-wrap break-words text-sm leading-6 text-content-muted [overflow-wrap:anywhere]">
      {renderRichText(review.body)}
    </div>
  );

  return (
    <article className="flex min-w-0 items-start overflow-hidden rounded-sheet border border-rule bg-surface/65">
      <div className="relative aspect-2/3 w-20 shrink-0 bg-surface-raised sm:w-24">
        <PosterImage
          path={review.posterPath}
          width="w342"
          alt={review.movieTitle}
          sizes="96px"
          className="object-cover"
        />
      </div>
      <div className="min-w-0 flex-1 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 break-words font-display text-lg font-medium leading-tight text-content [overflow-wrap:anywhere]">
            {review.movieTitle}
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
          <time dateTime={review.createdAt}>{new Date(review.createdAt).toLocaleDateString()}</time>
          {rating > 0 && (
            <span className="inline-flex items-center gap-1 font-semibold text-highlight" aria-label={`${rating} out of 10`}>
              <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
              {starsLabel(rating)}
            </span>
          )}
        </div>
        <div className="mt-3">{body}</div>
        {review.visibility === "public" && (
          <div className="mt-4 flex flex-wrap gap-2">
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
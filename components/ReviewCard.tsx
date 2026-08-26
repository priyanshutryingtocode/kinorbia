import Image from "next/image";
import { MessageSquare, Star } from "lucide-react";
import type { ReviewItem } from "@/types";
import SocialActionButton from "./SocialActionButton";
import SpoilerText from "./SpoilerText";
import ManageReviewForm from "./ManageReviewForm";
import { renderRichText } from "@/lib/renderRichText";
import { tmdbImage } from "@/lib/media";

type ReviewCardProps = {
  review: ReviewItem;
  rating?: number;
  currentUserEmail: string;
  path: string;
};

export default function ReviewCard({
  review,
  rating = 0,
  currentUserEmail,
  path,
}: ReviewCardProps) {
  const renderBody = () =>
    review.spoiler ? (
      <SpoilerText text={review.body} />
    ) : (
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-300">
        {renderRichText(review.body)}
      </div>
    );

  return (
    <article className="flex overflow-hidden rounded-xl border border-white/10 bg-neutral-900/50">
      <div className="relative w-24 shrink-0 bg-neutral-900 sm:w-32">
        {tmdbImage(review.posterPath, "w342") ? (
          <Image
            src={tmdbImage(review.posterPath, "w342") as string}
            alt={review.movieTitle}
            fill
            sizes="128px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-neutral-700">
            <MessageSquare className="h-8 w-8" />
          </div>
        )}
      </div>
      <div className="min-w-0 p-5">
        {rating > 0 && (
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-yellow-400">
            <Star className="h-4 w-4 fill-current" />
            {(rating / 2).toFixed(1)}
          </div>
        )}
        <h3 className="truncate text-lg font-bold text-white">{review.movieTitle}</h3>
        <p className="mt-1 text-xs text-neutral-500">
          by {review.userName} - {new Date(review.createdAt).toLocaleDateString()}
        </p>
        <span
          className={`mt-3 inline-flex rounded-full border px-2 py-1 text-[11px] font-bold uppercase tracking-wider ${
            review.visibility === "private"
              ? "border-white/10 bg-white/10 text-neutral-300"
              : "border-red-500/20 bg-red-500/10 text-red-300"
          }`}
        >
          {review.visibility}
        </span>
        <div className="mt-4">{renderBody()}</div>
        {review.visibility === "public" && (
          <div className="mt-4 flex flex-wrap gap-2">
            <SocialActionButton
              type="review"
              id={review._id}
              action="like"
              count={review.likedBy?.length || 0}
              active={Boolean(review.likedBy?.includes(currentUserEmail.toLowerCase()))}
              path={path}
            />
            <SocialActionButton
              type="review"
              id={review._id}
              action="save"
              count={review.savedBy?.length || 0}
              active={Boolean(review.savedBy?.includes(currentUserEmail.toLowerCase()))}
              path={path}
            />
          </div>
        )}
        {review.userEmail === currentUserEmail && <ManageReviewForm review={review} />}
      </div>
    </article>
  );
}
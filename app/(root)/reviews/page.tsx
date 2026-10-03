import Link from "next/link";
import { MessageSquare } from "lucide-react";
import type { Metadata } from "next";
import { requireUserEmail } from "@/lib/actions";
import ActionForm from "@/components/ActionForm";
import EmptyState from "@/components/EmptyState";
import FormPanel from "@/components/FormPanel";
import RouteShell from "@/components/RouteShell";
import PageHeader from "@/components/PageHeader";
import ReviewCard from "@/components/ReviewCard";
import SectionHeader from "@/components/SectionHeader";
import SubmitButton from "@/components/SubmitButton";
import VisibilityField from "@/components/VisibilityField";
import dbConnect from "@/lib/dbConnect";
import { visibleTo } from "@/lib/visibility";
import { buildReviewerMaps, dedupeFavorites, lookupRating } from "@/lib/reviewRatings";
import Review from "@/models/Review";
import User from "@/models/User";
import { createReview } from "./actions";
import { serializeReview, type RawReview } from "@/lib/serialize";
import { normalizeMediaType, mediaKey } from "@/lib/media";
import NumberedPagination from "@/components/NumberedPagination";
import { INDEX_PAGE_SIZES, paginate } from "@/lib/pagination";
import { parsePage } from "@/lib/searchParams";

type ReviewsSearchParams = { page?: string };

export const metadata: Metadata = {
  title: "Reviews",
  description: "Share quick reactions and longer takes on the films and shows you watch.",
};

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<ReviewsSearchParams>;
}) {
  const params = await searchParams;
  const requestedPage = parsePage(params.page);
  const currentUserEmail = await requireUserEmail();

  await dbConnect();

  // The review window and the signed-in user's rated favorites are independent
  // reads, so they go out together. They used to run in sequence, and against a
  // distant cluster each round-trip is the dominant cost on this page.
  const [reviewPage, user] = await Promise.all([
    paginate<RawReview>(
      Review,
      visibleTo(currentUserEmail),
      { createdAt: -1, _id: -1 },
      requestedPage,
      INDEX_PAGE_SIZES.reviews
    ),
    // Populates a select of rated favorites, so it needs four fields per entry --
    // and not the whole `watchlist` array, which this previously pulled along.
    User.findOne({ email: currentUserEmail })
      .select("favorites.movieId favorites.mediaType favorites.personalRating favorites.title")
      .lean<{
        favorites?: {
          movieId: string;
          mediaType?: string;
          personalRating?: number;
          title: string;
        }[];
      } | null>(),
  ]);

  const reviews = reviewPage.rows.map(serializeReview);
  // Byline targets and rating chips come from one batched read for the page
  // rather than a lookup per card, and no longer cost a second round-trip for
  // the same User documents.
  const { ratingMaps, usernames } = await buildReviewerMaps(
    reviews.map((review) => review.userEmail)
  );

  const favorites = dedupeFavorites(user?.favorites || []);
  const ratedFavorites = favorites.filter((movie) => (movie.personalRating || 0) > 0);

  const favoriteMovieId = "review-favorite-movie";
  const reviewBodyId = "review-body";

  return (
    <RouteShell spacing="standard" width="page">
      <PageHeader
        eyebrow="Community"
        title="Recent Reviews"
        description="Share quick reactions, longer takes, and the ratings behind your favorite films."
      />

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <FormPanel
          id="write-review"
          eyebrow="New entry"
          title="Write a review"
          description="Choose a rated title and leave a note for the community."
          className="lg:sticky lg:top-24"
        >
          {ratedFavorites.length > 0 ? (
            <ActionForm action={createReview} successMessage="Review published." resetOnSuccess className="kin-form-stack">
              <div className="kin-field">
                <label htmlFor={favoriteMovieId} className="kin-label">
                  Rated movie
                </label>
                <select
                  id={favoriteMovieId}
                  name="favoriteMovieId"
                  required
                  defaultValue=""
                  className="kin-input"
                >
                  <option value="" disabled>
                    Choose a rated movie
                  </option>
                  {ratedFavorites.map((movie) => (
                    <option
                      key={`${normalizeMediaType(movie.mediaType)}-${movie.movieId}`}
                      value={mediaKey(movie.mediaType, movie.movieId)}
                    >
                      {movie.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="kin-field">
                <label htmlFor={reviewBodyId} className="kin-label">
                  Review
                </label>
                <textarea
                  id={reviewBodyId}
                  name="body"
                  required
                  maxLength={1200}
                  rows={6}
                  placeholder="What stayed with you?"
                  className="kin-input resize-y"
                />
              </div>

              <VisibilityField legendClassName="kin-label" fieldsetClassName="kin-field" />

              <label className="kin-choice">
                <input type="checkbox" name="spoiler" />
                Contains spoilers
              </label>

              <SubmitButton pendingLabel="Publishing..." variant="primary" className="w-full">
                Publish review
              </SubmitButton>
            </ActionForm>
          ) : (
            <EmptyState
              compact
              icon={<MessageSquare className="h-5 w-5" aria-hidden="true" />}
              title="Rate a movie first"
              description="Your rating lives on each movie page. Rate a title, then return here to review it."
            >
              <Link href="/" className="kin-focus text-sm font-semibold text-highlight-vivid underline-offset-4 hover:underline">
                Browse movies to rate
              </Link>
            </EmptyState>
          )}
        </FormPanel>

        <section aria-labelledby="reviews-list-heading">
          <SectionHeader
            id="reviews-list"
            eyebrow="Community desk"
            title="Latest reviews"
            description={
              reviewPage.total > 0
                ? `${reviewPage.total} ${reviewPage.total === 1 ? "review" : "reviews"}`
                : "The latest public and personal reviews"
            }
          />
          <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
            {reviews.length > 0 ? (
              reviews.map((review) => (
                <ReviewCard
                  key={review._id}
                  review={review}
                  rating={lookupRating(ratingMaps, review)}
                  currentUserEmail={currentUserEmail}
                  path="/reviews"
                  usernames={usernames}
                />
              ))
            ) : (
              <EmptyState
                compact
                className="xl:col-span-2"
                title="No reviews yet"
                description="Be the first to publish a review."
              />
            )}
          </div>
          <NumberedPagination
            label="Reviews"
            page={reviewPage.page}
            totalPages={reviewPage.totalPages}
            total={reviewPage.total}
            pageSize={INDEX_PAGE_SIZES.reviews}
            buildHref={reviewsHref}
          />
        </section>
      </div>
    </RouteShell>
  );
}

// Page 1 stays at the bare path so the first page keeps its canonical URL.
function reviewsHref(page: number) {
  return page > 1 ? `/reviews?page=${page}` : "/reviews";
}

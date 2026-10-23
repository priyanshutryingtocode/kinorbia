
import "server-only";

import dbConnect from "@/lib/dbConnect";
import { visibleTo } from "@/lib/visibility";
import { buildReviewerMaps } from "@/lib/reviewRatings";
import { listUserMediaRows } from "@/features/media/userMovie";
import { INDEX_PAGE_SIZES, paginate } from "@/lib/pagination";
import { serializeReview, type RawReview } from "@/features/reviews/serializers";
import Review from "@/models/Review";

type RatedFavorite = {
  movieId: string;
  mediaType?: string;
  personalRating?: number;
  title: string;
};

type ReviewIndex = {
  reviews: ReturnType<typeof serializeReview>[];
  ratedFavorites: RatedFavorite[];
  usernames: Map<string, string>;
  ratingMaps: Map<string, Map<string, number>>;
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
};

export async function getReviewIndex(
  currentUserEmail: string,
  requestedPage: number
): Promise<ReviewIndex> {
  await dbConnect();

  const [reviewPage, ratedFavorites] = await Promise.all([
    paginate<RawReview>(
      Review,
      visibleTo(currentUserEmail),
      { createdAt: -1, _id: -1 },
      requestedPage,
      INDEX_PAGE_SIZES.reviews
    ),
    listUserMediaRows(currentUserEmail, "rated"),
  ]);

  const { rows, ...bounds } = reviewPage;
  const reviews = rows.map(serializeReview);

  const { ratingMaps, usernames } = await buildReviewerMaps(
    reviews.map((review) => review.userEmail)
  );

  return {
    reviews,
    ratedFavorites,
    usernames,
    ratingMaps,
    ...bounds,
    pageSize: INDEX_PAGE_SIZES.reviews,
  };
}

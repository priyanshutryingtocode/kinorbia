
import "server-only";

import dbConnect from "@/lib/dbConnect";
import { visibleTo } from "@/lib/visibility";
import { buildReviewerMaps } from "@/lib/reviewRatings";
import { listUserMedia } from "@/features/media/userMovie";
import { INDEX_PAGE_SIZES, paginate } from "@/lib/pagination";
import { serializeReview, type RawReview } from "@/features/reviews/serializers";
import Review from "@/models/Review";

// The select of rated favorites is built from these four fields only; the page
// never reads the rest of a favorite, so the projection is deliberately narrow
// and the type says so rather than pretending to be the full FavoriteMovie.
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

  // The review window and the signed-in user's rated favorites are independent reads,
  // so they go out together. They used to run in sequence, and against a distant
  // cluster each round-trip is the dominant cost on this page.
  const [reviewPage, ratedFavorites] = await Promise.all([
    paginate<RawReview>(
      Review,
      visibleTo(currentUserEmail),
      { createdAt: -1, _id: -1 },
      requestedPage,
      INDEX_PAGE_SIZES.reviews
    ),
    // The select lists rated favorites, which are exactly the rows carrying a rating.
    listUserMedia(currentUserEmail, "rated").then((result) => result.rows),
  ]);

  const { rows, ...bounds } = reviewPage;
  const reviews = rows.map(serializeReview);

  // Byline targets and rating chips come from one batched read for the page rather
  // than a lookup per card, and no longer cost a second round-trip for the same
  // User documents.
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

import Link from "next/link";
import { redirect } from "next/navigation";
import {List, Star} from "lucide-react";
import type { Metadata } from "next";
import RouteShell from "@/components/RouteShell";
import PageHeader from "@/components/PageHeader";
import PosterImage from "@/components/PosterImage";
import SpoilerText from "@/components/SpoilerText";
import { renderRichText } from "@/lib/renderRichText";
import { starsLabel } from "@/lib/media";
import FeedTabs from "@/components/FeedTabs";
import EmptyState from "@/components/EmptyState";
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import { buildReviewerMaps, lookupRating } from "@/lib/reviewRatings";
import { usernameFor } from "@/lib/profileLinks";
import UserNameLink from "@/components/UserNameLink";
import type { MediaType } from "@/types";
import User from "@/models/User";
import MovieList from "@/models/MovieList";
import Review from "@/models/Review";

import { emailMatch } from "@/lib/emailMatch";
import { publiclyVisible } from "@/lib/visibility";
import NumberedPagination from "@/components/NumberedPagination";
import { INDEX_PAGE_SIZES, pageBounds } from "@/lib/pagination";
import { parsePage } from "@/lib/searchParams";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Activity",
  description: "The latest reviews and lists shared by the KinOrbia community.",
};

type ActivityPageProps = {
  searchParams: Promise<{ feed?: string; page?: string }> | { feed?: string; page?: string };
};

type FeedReview = {
  _id: { toString: () => string };
  userName: string;
  userEmail: string;
  movieTitle: string;
  posterPath?: string;
  movieId?: string;
  mediaType?: MediaType;
  body: string;
  spoiler?: boolean;
  createdAt: Date;
};

type FeedList = {
  _id: { toString: () => string };
  userName: string;
  userEmail: string;
  title: string;
  description?: string;
  movies: { posterPath?: string }[];
  createdAt: Date;
};

// One merged timeline across two collections, so a page is a page.
//
// This used to fetch the newest 12 reviews and the newest 8 lists and merge them
// in JS, which cannot be paged: the cap was invisible, there was no total, and
// everything past those twenty rows was unreachable. Worse, the two limits made
// "page 2" meaningless -- the boundary between reviews and lists moved with the
// data. `$unionWith` gives one sorted stream that skips and limits correctly.
//
// Each side projects flat, under a `kind` discriminator, rather than nesting
// itself under a `payload` key. Nesting is what this looked like first, and it
// silently returned nothing: in `$project` a bare `{ _id: 1, ... }` is a
// projection of an existing path called `payload`, not a document to build, so
// MongoDB dropped the field and the rows arrived empty. The two shapes have no
// colliding field names anyway, so flat is both simpler and correct.
function mergedPipeline(filter: Record<string, unknown>) {
  // Each collection is sorted before the union rather than after, so neither side
  // has to be read in full. The union result is re-sorted because the two sides
  // arrive interleaved rather than concatenated.
  const windowed = [{ $match: filter }, { $sort: { createdAt: -1, _id: -1 } }];

  return [
    ...windowed,
    {
      $project: {
        kind: { $literal: "review" },
        date: "$createdAt",
        // Tiebreaker across two collections: `createdAt` alone would leave page
        // boundaries free to shuffle rows that share a timestamp.
        sortId: "$_id",
        userName: 1,
        userEmail: 1,
        createdAt: 1,
        movieTitle: 1,
        posterPath: 1,
        movieId: 1,
        mediaType: 1,
        body: 1,
        spoiler: 1,
      },
    },
    {
      $unionWith: {
        coll: MovieList.collection.name,
        pipeline: [
          ...windowed,
          {
            $project: {
              kind: { $literal: "list" },
              date: "$createdAt",
              sortId: "$_id",
              userName: 1,
              userEmail: 1,
              createdAt: 1,
              title: 1,
              description: 1,
              // The row renders only the first poster, so one entry is
              // transferred instead of a list that can hold hundreds.
              movies: { $slice: [{ $ifNull: ["$movies", []] }, 1] },
            },
          },
        ],
      },
    },
    { $sort: { date: -1, sortId: -1 } },
  ];
}

type MergedRow = {
  kind: "review" | "list";
  date: Date;
  sortId: unknown;
} & (Partial<FeedReview> & Partial<FeedList>);

// `$facet` gets the window and the total in one round-trip, which matters when
// each one costs a network hop. `$facet` preserves input order, so the sort done
// above is what `rows` arrives in.
async function fetchFeedPage(filter: Record<string, unknown>, page: number) {
  const [result] = await Review.collection
    .aggregate<{ rows: MergedRow[]; total: { count: number }[] }>([
      ...mergedPipeline(filter),
      {
        $facet: {
          rows: [
            { $skip: (page - 1) * INDEX_PAGE_SIZES.activity },
            { $limit: INDEX_PAGE_SIZES.activity },
          ],
          total: [{ $count: "count" }],
        },
      },
    ])
    .toArray();

  const rows = (result?.rows ?? []).map((row) =>
    row.kind === "review"
      ? { kind: "review" as const, date: row.date, review: row as FeedReview }
      : { kind: "list" as const, date: row.date, list: row as FeedList }
  );

  return { rows, total: result?.total?.[0]?.count ?? 0 };
}

export default async function ActivityPage({ searchParams }: ActivityPageProps) {
  const { feed, page } = await searchParams;
  const isFollowingFeed = feed === "following";
  const requestedPage = parsePage(page);

  const session = await auth();
  const sessionEmail = session?.user?.email ?? null;
  if (isFollowingFeed && !sessionEmail) {
    redirect("/login");
  }

  await dbConnect();

  const following: string[] = [];
  if (isFollowingFeed && sessionEmail) {
    const currentUser = await User.findOne({ email: emailMatch(sessionEmail) })
      .select("following")
      .lean<{ following?: string[] } | null>();
    following.push(...(currentUser?.following || []));
  }

  const scope = isFollowingFeed
    ? { userEmail: { $in: following } }
    : {};

  const feedFilter = { ...publiclyVisible(), ...scope };

  // Clamped the same way `paginate` clamps: an out-of-range page re-reads the
  // last real page rather than rendering an empty timeline.
  const feedPage = await fetchFeedPage(feedFilter, requestedPage);
  const bounds = pageBounds(feedPage.total, requestedPage, INDEX_PAGE_SIZES.activity);
  const items =
    bounds.page === requestedPage
      ? feedPage.rows
      : (await fetchFeedPage(feedFilter, bounds.page)).rows;

  // Byline targets and rating chips from one batched read for the whole page,
  // rather than a lookup per card plus a second read for the same users.
  const { ratingMaps, usernames } = await buildReviewerMaps(
    items.map((row) => (row.kind === "review" ? row.review.userEmail : row.list.userEmail))
  );

  return (
    <RouteShell spacing="standard" width="standard">
      <PageHeader
        eyebrow="Community"
        title="Activity"
        description={
          isFollowingFeed
            ? "Fresh reviews and lists from the members you follow."
            : "Fresh public reviews and lists from KinOrbia members."
        }
      />

      <div className="mt-6">
        <FeedTabs />
      </div>

      {isFollowingFeed && following.length === 0 ? (
        <EmptyState
          compact
          headingLevel={2}
          className="mt-8"
          title="You are not following anyone yet"
          description="Follow members from their profiles and their reviews and lists will show up here."
        />
      ) : items.length > 0 ? (
        <ol className="kin-editorial-list mt-8" aria-label="Activity feed">
          {items.map((item) => {
            if (item.kind === "review") {
              const posterPath = item.review.posterPath;
              const rating = lookupRating(ratingMaps, item.review);

              return (
                <li
                  key={`review-${item.review._id}`}
                  className="kin-editorial-row gap-4 transition-colors hover:bg-surface/40 sm:gap-6"
                >
                  <div className="relative h-24 w-16 shrink-0 overflow-hidden bg-surface-raised sm:h-32 sm:w-20 lg:h-40 lg:w-28">
                    <PosterImage
                      path={posterPath}
                      width="w185"
                      alt={item.review.movieTitle}
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                  <article className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-content-subtle">
                      <span className="font-semibold uppercase tracking-overline text-content-muted">
                        <UserNameLink
                          userName={item.review.userName}
                          username={usernameFor(usernames, item.review.userEmail)}
                        />{" "}
                        reviewed
                      </span>
                      <span aria-hidden="true">·</span>
                      <time dateTime={new Date(item.review.createdAt).toISOString()}>
                        {new Date(item.review.createdAt).toLocaleDateString()}
                      </time>
                      {rating > 0 && (
                        <span
                          className="inline-flex items-center gap-1 font-semibold text-highlight"
                          aria-label={`${rating} out of 10`}
                        >
                          <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                          {starsLabel(rating)} stars
                        </span>
                      )}
                    </div>
                    <h2 className="mt-2 break-words font-display text-xl font-medium leading-tight text-content">
                      {item.review.movieTitle}
                    </h2>
                    {item.review.spoiler && (
                      <span className="mt-2 inline-flex items-center border border-highlight/25 bg-highlight-soft px-2 py-1 text-overline font-medium uppercase tracking-overline text-highlight">
                        Spoiler
                      </span>
                    )}
                    <div className="mt-3 min-w-0 break-words">
                      {item.review.spoiler ? (
                        <SpoilerText text={item.review.body} />
                      ) : (
                        // renderRichText, so **bold**, *italic* and [links](url)
                        // render here as they do on the review cards instead of
                        // showing their asterisks and brackets.
                        <div className="whitespace-pre-wrap break-words text-sm leading-6 text-content-muted">
                          {renderRichText(item.review.body)}
                        </div>
                      )}
                    </div>
                  </article>
                </li>
              );
            }

            const posterPath = item.list.movies?.[0]?.posterPath;

            return (
              <li
                key={`list-${item.list._id}`}
                className="kin-editorial-row gap-4 transition-colors hover:bg-surface/40 sm:gap-6"
              >
                <div className="relative h-24 w-16 shrink-0 overflow-hidden bg-surface-raised sm:h-32 sm:w-20 lg:h-40 lg:w-28">
                  <PosterImage
                    path={posterPath}
                    width="w185"
                    alt=""
                    sizes="64px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  {/* The byline sits outside the <Link> on purpose. It used to be
                      inside, which made the author's name un-linkable -- an anchor
                      inside an anchor is invalid HTML and unreachable by keyboard.
                      The trade-off is that the byline row is no longer part of the
                      click target; the title and description are. */}
                  <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-content-subtle">
                    <span className="font-semibold uppercase tracking-overline text-content-muted">
                      <UserNameLink
                        userName={item.list.userName}
                        username={usernameFor(usernames, item.list.userEmail)}
                      />{" "}
                      created a list
                    </span>
                    <span aria-hidden="true">·</span>
                    <time dateTime={new Date(item.list.createdAt).toISOString()}>
                      {new Date(item.list.createdAt).toLocaleDateString()}
                    </time>
                  </div>
                  <Link
                    href={`/lists/${item.list._id}`}
                    className="kin-focus group block py-0.5"
                  >
                    <h2 className="mt-2 flex min-w-0 items-start gap-2 break-words font-display text-xl font-medium leading-tight text-content transition-colors group-hover:text-highlight">
                      <List className="mt-1 h-4 w-4 shrink-0 text-highlight" aria-hidden="true" />
                      <span className="min-w-0 break-words">{item.list.title}</span>
                    </h2>
                    {item.list.description && (
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-content-muted">
                        {item.list.description}
                      </p>
                    )}
                  </Link>
                </div>
              </li>
            );
          })}
          <NumberedPagination
            label="Activity"
            page={bounds.page}
            totalPages={bounds.totalPages}
            total={feedPage.total}
            pageSize={INDEX_PAGE_SIZES.activity}
            buildHref={(target) => activityHref(isFollowingFeed, target)}
          />
        </ol>
      ) : (
        <EmptyState
          compact
          headingLevel={2}
          className="mt-8"
          title="Nothing here yet"
          description={
            isFollowingFeed
              ? "Members you follow haven't shared anything recently."
              : "Be the first to share a review or list."
          }
        />
      )}
    </RouteShell>
  );
}

// The `feed` param is preserved across pages, and page 1 stays on the bare path
// so the first page of each feed keeps its canonical URL.
function activityHref(isFollowingFeed: boolean, page: number) {
  const params = new URLSearchParams();
  if (isFollowingFeed) {
    params.set("feed", "following");
  }
  if (page > 1) {
    params.set("page", String(page));
  }
  const query = params.toString();
  return query ? `/activity?${query}` : "/activity";
}

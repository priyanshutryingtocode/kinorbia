import type { Metadata } from "next";
import { getFavoritePage, getInsightsSource, getListPage, getProfileIdentity, getProfileOverview, getRelationshipCounts, getReviewPage, getWatchlistPage } from "@/features/profile/queries";
import { PROFILE_PAGE_SIZES } from "@/features/profile/constants";
import PosterImage from "@/components/PosterImage";
import RouteShell from "@/components/RouteShell";
import SpoilerText from "@/components/SpoilerText";
import { renderRichText } from "@/lib/renderRichText";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {Download, ExternalLink} from "lucide-react";
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import { buildInsights, yearsFromJournal } from "@/lib/insights";
import { countLabel, formatDate, mediaHref, mediaKey, normalizeMediaType } from "@/lib/media";
import { firstValue, libraryFacetQuery, parseLibraryFacets, parsePage, parseYear } from "@/lib/searchParams";

import { buildUsernameMap } from "@/lib/profileLinks";
import EmptyState from "@/components/EmptyState";
import MovieCard from "@/components/MovieCard";
import ProfileActions from "@/components/profileActions";
import ProfileFavorites from "@/components/ProfileFavorites";
import ProfileHeader from "@/components/ProfileHeader";
import ProfileInsights from "@/components/ProfileInsights";
import ProfileMetricRail from "@/components/ProfileMetricRail";
import ProfilePagination from "@/components/ProfilePagination";
import ProfilePanel from "@/components/ProfilePanel";
import ProfileTabs, { PROFILE_TABS, type ProfileTab } from "@/components/ProfileTabs";
import ShareActivityToggle from "@/components/ShareActivityToggle";
import SearchResultCard from "@/components/SearchResultCard";
import LibraryFilters from "@/components/LibraryFilters";
import { getTasteRecommendations } from "@/features/media/recommendations";
import ProfileVerifyBanner from "@/components/ProfileVerifyBanner";
import { isEmailVerified } from "@/lib/verification";
import ReviewCard from "@/components/ReviewCard";
import type { JournalItem, MovieListItem, ReviewItem, WatchlistMovie } from "@/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Profile",
  description: "Your favorites, watch history, watchlist, reviews, lists, journal, and insights.",
};

type ProfileSearchParams = {
  tab?: string | string[];
  page?: string | string[];
  year?: string | string[];
  genre?: string | string[];
  minRating?: string | string[];
  sort?: string | string[];
};

function parseTab(value: string | string[] | undefined): ProfileTab {
  const tab = firstValue(value);
  return PROFILE_TABS.some((entry) => entry.key === tab)
    ? (tab as ProfileTab)
    : "overview";
}

// One place for both shelves: a shelf narrowed to zero by a filter must not claim to be
// empty, because the member's own next move (widen the filter, not add titles) depends
// on which of the two it is.
function ShelfEmpty({ filtered, emptyTitle, emptyDescription }: { filtered: boolean; emptyTitle: string; emptyDescription: string }) {
  return filtered ? (
    <EmptyState compact title="Nothing matches your filters" description="Try widening or clearing them." />
  ) : (
    <EmptyState compact title={emptyTitle} description={emptyDescription} />
  );
}

function WatchedCard({ item }: { item: JournalItem }) {
  const href = mediaHref(item.mediaType, item.movieId);
  const content = (
    <>
      <div className="relative aspect-2/3 bg-surface-raised">
        <PosterImage
          path={item.posterPath}
          width="w342"
          alt={item.title}
          sizes="(min-width: 768px) 20vw, 45vw"
          className="object-cover"
        />
      </div>
      <div className="p-3">
        <h3 className="truncate text-sm font-semibold text-content">{item.title}</h3>
        <p className="mt-1 text-xs text-content-muted">{formatDate(item.watchedAt)}</p>
      </div>
    </>
  );
  return (
    <Link
      href={href}
      className="kin-focus block overflow-hidden rounded-sm border border-rule bg-surface-raised/45 transition-colors hover:border-highlight/40"
    >
      {content}
    </Link>
  );
}

function CompactReview({ review }: { review: ReviewItem }) {
  return (
    // A container, not a link: it used to be a <Link>, putting the spoiler's reveal
    // <button> inside an <a> -- invalid HTML, unreachable by keyboard. The title navigates.
    <div className="group border-b border-rule py-4 transition-colors last:border-b-0 hover:bg-surface-raised/25">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-lg font-semibold">
          <Link href="/reviews" className="kin-focus text-content transition-colors group-hover:text-highlight">
            {review.title}
          </Link>
        </h3>
        {review.spoiler && <span className="rounded-full border border-highlight/20 bg-highlight/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-highlight">Spoiler</span>}
      </div>
      {review.spoiler ? (
        <SpoilerText text={review.body} />
      ) : (
        <div className="mt-3 line-clamp-3 text-sm leading-6 text-content-muted">
          {renderRichText(review.body)}
        </div>
      )}
    </div>
  );
}

function CompactList({ list }: { list: MovieListItem }) {
  return (
    <Link href={`/lists/${list._id}`} className="kin-focus group block border-b border-rule py-4 transition-colors last:border-b-0 hover:bg-surface-raised/25">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-lg font-semibold text-content group-hover:text-highlight">{list.title}</h3>
        <span className="shrink-0 text-xs text-content-muted">{countLabel(list.movies.length, "title")}</span>
      </div>
      {list.description && <p className="mt-3 line-clamp-2 text-sm leading-6 text-content-muted">{list.description}</p>}
    </Link>
  );
}

function OverviewPanel({
  data,
  emailVerified,
}: {
  data: Awaited<ReturnType<typeof getProfileOverview>>;
  emailVerified: boolean;
}) {
  return (
    <div className="space-y-8">
      <section id="overview" aria-labelledby="overview-heading">
        <h2 id="overview-heading" className="sr-only">Profile overview</h2>
        <div className="mb-6">
          <ProfileVerifyBanner verified={emailVerified} />
        </div>
        <ProfileMetricRail
          ariaLabel="Profile summary"
          metrics={[
            { label: "Titles watched", value: data.uniqueWatchedCount, detail: "Unique movies and shows" },
            { label: "Current streak", value: `${data.currentStreak} days`, detail: "Consecutive watch-log dates" },
            {
              label: "Average rating",
              value: data.ratedCount ? `${data.averageRating.toFixed(1)}/5` : "—",
              detail: data.ratedCount ? `${data.ratedCount} rated ${data.ratedCount === 1 ? "favorite" : "favorites"}` : "No ratings yet",
              emphasis: "gold",
            },
            { label: "Favorites", value: data.favoriteCount, detail: "Personal shelf", emphasis: "red" },
          ]}
        />
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-rule pb-4 text-xs text-content-muted">
          {[
            { label: "watchlist", value: data.watchlistCount, href: "/profile?tab=watchlist" },
            { label: "reviews", value: data.reviewCount, href: "/profile?tab=reviews" },
            { label: "lists", value: data.listCount, href: "/profile?tab=lists" },
          ].map((item) => (
            <Link key={item.label} href={item.href} className="kin-focus rounded-sm transition-colors hover:text-highlight">
              <span className="font-display text-base text-content">{item.value}</span> {item.label}
            </Link>
          ))}
        </div>
      </section>

      <ProfilePanel id="recent" eyebrow="Last watched" title="Recent titles">
        {data.recentJournal.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{data.recentJournal.map((item) => <WatchedCard key={item.key} item={item} />)}</div>
        ) : (
          <EmptyState compact title="No watch history yet" description="Mark a title as watched and it will appear here." />
        )}
      </ProfilePanel>

      <div className="grid gap-8 lg:grid-cols-2">
        <ProfilePanel id="recent-reviews" eyebrow="Writing" title="Recent reviews" action={{ href: "/profile?tab=reviews", label: "View all" }}>
          <div>{data.recentReviews.length ? data.recentReviews.map((review) => <CompactReview key={review._id} review={review} />) : <EmptyState compact title="No reviews yet" description="Write a review to start your archive." />}</div>
        </ProfilePanel>
        <ProfilePanel id="recent-lists" eyebrow="Collections" title="Recent lists" action={{ href: "/profile?tab=lists", label: "View all" }}>
          <div>{data.recentLists.length ? data.recentLists.map((list) => <CompactList key={list._id} list={list} />) : <EmptyState compact title="No lists yet" description="Create a list to organize your recommendations." />}</div>
        </ProfilePanel>
      </div>
    </div>
  );
}

function WatchlistGrid({ items }: { items: WatchlistMovie[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((movie, index) => (
        <MovieCard
          key={mediaKey(movie.mediaType, movie.movieId)}
          index={index}
          movie={{
            id: movie.movieId,
            title: movie.title,
            poster_path: movie.posterPath,
            vote_average: movie.voteAverage,
              release_date: movie.releaseDate,
                // A watchlist title that is also a favorite shows its badge. Unrated rows pass
                // undefined so MovieCard omits the chip: it guards on `!== undefined`, so a
                // plain 0 rendered a "Rate" button here with no onRateClick behind it.
                personalRating: movie.personalRating || undefined,
                mediaType: normalizeMediaType(movie.mediaType),
          }}
        />
      ))}
    </div>
  );
}

export default async function ProfilePage({ searchParams }: { searchParams: Promise<ProfileSearchParams> }) {
  const params = await searchParams;
  const tab = parseTab(params.tab);
  const requestedPage = parsePage(params.page);
  const requestedYear = parseYear(params.year);
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  const sessionName = session?.user?.name;
  const sessionImage = session?.user?.image;

  if (!email) {
    redirect("/login");
  }

  await dbConnect();
  const identity = await getProfileIdentity(email);
  if (!identity) {
    notFound();
  }

  const relationshipPromise = getRelationshipCounts(identity);
  let panel;
  let selectedYear: number | undefined;

  // Library facets only apply to the two tabs that read a personal shelf. Parsed once here
  // so the filter bar, the query and the pagination links all see the same narrowed set.
  const facets = parseLibraryFacets(params);
  // Any facet that narrows to nothing makes the shelf empty without it being empty. Saying
  // "your watchlist is empty" to someone holding 30 titles is a lie they can act on wrongly.
  const shelfFiltered = libraryFacetQuery(facets).size > 0;

  if (tab === "overview") {
    const [overview, emailVerified] = await Promise.all([
      getProfileOverview(email),
      isEmailVerified(email),
    ]);
    panel = <OverviewPanel data={overview} emailVerified={emailVerified} />;
  } else if (tab === "insights") {
    const source = await getInsightsSource(email);
    const years = yearsFromJournal(source.journal);
    selectedYear = requestedYear && years.includes(requestedYear) ? requestedYear : undefined;
    const insights = buildInsights(source.journal, source.favorites, selectedYear);
    panel = (
      <ProfilePanel id="insights" eyebrow="Patterns" title="Viewing insights" description="Explore your watch rhythm, rating habits, genre mix, and community comparison.">
        <ProfileInsights insights={insights} years={years} selectedYear={selectedYear} favorites={source.favorites} userEmail={email} />
      </ProfilePanel>
    );
  } else if (tab === "foryou") {
    const taste = await getTasteRecommendations(email);
    panel = (
      <ProfilePanel
        id="foryou"
        eyebrow="Based on what you have watched"
        title="For you"
        description="Scored against the genres and ratings in your watch history."
      >
        {!taste.profile.ready ? (
          <EmptyState
            compact
            title="Not enough history yet"
            description={`Recommendations appear once you have watched a few more titles. ${taste.profile.sampleSize} so far.`}
          />
        ) : taste.recommendations.length === 0 ? (
          <EmptyState
            compact
            title="Nothing to suggest yet"
            description="Watch or rate a few more titles and this fills in."
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {taste.recommendations.map((item) => (
              <SearchResultCard
                key={`${item.mediaType}-${item.id}`}
                movie={item}
              />
            ))}
          </ul>
        )}
      </ProfilePanel>
    );
  } else if (tab === "favorites") {
    const result = await getFavoritePage(email, requestedPage, facets);
    panel = (
      <ProfilePanel id="favorites" eyebrow="Personal shelf" title="Favorites" description="Rate the titles you love and keep your personal ratings up to date.">
        <LibraryFilters tab={tab} facets={facets} showRating />
        {result.total ? <ProfileFavorites initialFavorites={result.items} /> : <ShelfEmpty filtered={shelfFiltered} emptyTitle="No favorites yet" emptyDescription="Add movies and shows to build your personal shelf." />}
        <ProfilePagination tab={tab} page={result.page} totalPages={result.totalPages} total={result.total} pageSize={PROFILE_PAGE_SIZES.favorites} facets={facets} />
      </ProfilePanel>
    );
  } else if (tab === "watchlist") {
    const result = await getWatchlistPage(email, requestedPage, facets);
    panel = (
      <ProfilePanel id="watchlist" eyebrow="Up next" title="Watchlist" description="The movies and shows you are planning to watch next.">
        {/* A rating filter stays visible even when nothing is rated: otherwise the control
            vanishes, the pill with it, and the filter runs invisibly against a shelf it
            cannot match. Better the member can see it and take it off. */}
        <LibraryFilters tab={tab} facets={facets} showRating={(result.ratedCount ?? 0) > 0 || facets.minRating !== undefined} />
        {result.total ? <WatchlistGrid items={result.items} /> : <ShelfEmpty filtered={shelfFiltered} emptyTitle="Your watchlist is empty" emptyDescription="Add titles from any movie or show page." />}
        <ProfilePagination tab={tab} page={result.page} totalPages={result.totalPages} total={result.total} pageSize={PROFILE_PAGE_SIZES.watchlist} facets={facets} />
      </ProfilePanel>
    );
  } else if (tab === "reviews") {
    const result = await getReviewPage(email, requestedPage);
    // Every row on this tab is the viewer's own, so the lookup is a single key.
    const usernames = await buildUsernameMap([email]);
    panel = (
      <ProfilePanel id="reviews" eyebrow="Writing archive" title="Reviews" description="Your public and private reviews across every title.">
        {result.total ? <div className="grid gap-4 xl:grid-cols-2">{result.items.map((review) => <ReviewCard key={review._id} review={review} rating={result.ratingMap.get(mediaKey(review.mediaType, review.movieId)) || 0} currentUserEmail={email} path="/profile" usernames={usernames} />)}</div> : <EmptyState compact title="No reviews yet" description="Write your first review from a movie or show page." />}
        <ProfilePagination tab={tab} page={result.page} totalPages={result.totalPages} total={result.total} pageSize={PROFILE_PAGE_SIZES.reviews} />
      </ProfilePanel>
    );
  } else if (tab === "lists") {
    const result = await getListPage(email, requestedPage);
    panel = (
      <ProfilePanel id="lists" eyebrow="Collections" title="Lists" description="Public and private collections built from movies and shows.">
        {result.total ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{result.items.map((list) => <CompactList key={list._id} list={list} />)}</div> : <EmptyState compact title="No lists yet" description="Create a list to collect recommendations." />}
        <ProfilePagination tab={tab} page={result.page} totalPages={result.totalPages} total={result.total} pageSize={PROFILE_PAGE_SIZES.lists} />
      </ProfilePanel>
    );
  } else if (tab === "settings") {
    panel = (
      <ProfilePanel
        id="settings"
        eyebrow="Preferences"
        title="Settings"
        description="Who can see your activity, and a copy of everything you have here."
      >
        <div className="max-w-2xl space-y-8">
          <section aria-labelledby="settings-sharing">
            <h2 id="settings-sharing" className="kin-overline mb-3 text-highlight-muted">
              Sharing
            </h2>
            <ShareActivityToggle initialShare={Boolean(identity.shareActivity)} />
            <p className="mt-3 text-xs leading-5 text-content-muted">
              Turning this on applies to titles you mark watched from now on. Turning it off also
              removes what has already been shared.
            </p>
          </section>

          <section aria-labelledby="settings-data" className="border-t border-rule pt-8">
            <h2 id="settings-data" className="kin-overline mb-3 text-highlight-muted">
              Your data
            </h2>
            <a
              href="/api/user/export"
              className="kin-focus inline-flex items-center gap-2 rounded-full border border-rule bg-surface px-4 py-2 text-sm font-semibold text-content transition hover:border-highlight/30 hover:text-content"
            >
              <Download className="h-4 w-4" />
              Download my data
            </a>
            <p className="mt-3 max-w-prose text-xs leading-5 text-content-muted">
              A JSON file of your profile, favourites, watchlist, watch history, reviews and lists.
              It contains your own data only. People you follow appear by username, and anyone who
              liked or saved your writing is counted rather than named. Up to 5 downloads a minute.
            </p>
          </section>
        </div>
      </ProfilePanel>
    );
  }

  const relationships = await relationshipPromise;
  return (
    <RouteShell spacing="extended" width="frame">
      <ProfileHeader
        name={identity.name || sessionName || "KinOrbia user"}
        username={identity.username}
        bio={identity.bio}
        image={identity.image || sessionImage}
        createdAt={identity.createdAt}
        followers={relationships.followers}
        following={relationships.following}
      >
        {identity.username && <Link href={`/u/${encodeURIComponent(identity.username)}`} className="kin-focus inline-flex items-center gap-2 rounded-full border border-rule bg-surface px-4 py-2 text-sm font-semibold text-content transition hover:border-highlight/30 hover:text-content"><ExternalLink className="h-4 w-4" />Public profile</Link>}
        <ProfileActions user={{ name: identity.name || sessionName || "KinOrbia user", bio: identity.bio || "", username: identity.username }} />
      </ProfileHeader>

      <div className="kin-sticky-bar sticky top-20 z-30 -mx-4 mt-5 border-y border-rule bg-canvas/80 px-4 py-2 backdrop-blur-xl sm:mx-0 sm:px-0">
        <ProfileTabs current={tab} year={selectedYear} />
      </div>

      <div className="mt-8">{panel}</div>
    </RouteShell>
  );
}

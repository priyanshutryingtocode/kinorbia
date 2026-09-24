import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Download, ExternalLink, Film } from "lucide-react";
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import { buildInsights, yearsFromJournal } from "@/lib/insights";
import { mediaKey, normalizeMediaType, tmdbImage } from "@/lib/media";
import {
  getFavoritePage,
  getInsightsSource,
  getJournalPage,
  getListPage,
  getProfileIdentity,
  getProfileOverview,
  getRelationshipCounts,
  getReviewPage,
  getWatchlistPage,
  PROFILE_PAGE_SIZES,
} from "@/lib/profileData";
import EmptyState from "@/components/EmptyState";
import MovieCard from "@/components/MovieCard";
import ProfileActions from "@/components/profileActions";
import ProfileFavorites from "@/components/ProfileFavorites";
import ProfileHeader from "@/components/ProfileHeader";
import ProfileInsights from "@/components/ProfileInsights";
import ProfileMetricRail from "@/components/ProfileMetricRail";
import ProfilePagination from "@/components/ProfilePagination";
import ProfilePanel from "@/components/ProfilePanel";
import ProfileTabs, { type ProfileTab } from "@/components/ProfileTabs";
import ReviewCard from "@/components/ReviewCard";
import type { JournalItem, MovieListItem, ReviewItem, WatchlistMovie } from "@/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Profile",
  description: "Your favorites, watch history, watchlist, reviews, lists, journal, and insights.",
};

const PROFILE_TABS: ProfileTab[] = [
  "overview",
  "insights",
  "favorites",
  "watchlist",
  "reviews",
  "lists",
  "journal",
];

type ProfileSearchParams = {
  tab?: string | string[];
  page?: string | string[];
  year?: string | string[];
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseTab(value: string | string[] | undefined): ProfileTab {
  const tab = firstValue(value);
  return PROFILE_TABS.includes(tab as ProfileTab) ? (tab as ProfileTab) : "overview";
}

function parsePage(value: string | string[] | undefined) {
  const raw = firstValue(value)?.trim();
  if (!raw || !/^[1-9]\d*$/.test(raw)) {
    return 1;
  }
  const page = Number(raw);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

function parseYear(value: string | string[] | undefined) {
  const raw = firstValue(value)?.trim();
  if (!raw || !/^\d{4}$/.test(raw)) {
    return undefined;
  }
  const year = Number(raw);
  return year >= 1900 && year <= 2200 ? year : undefined;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function JournalCard({ item }: { item: JournalItem }) {
  const poster = tmdbImage(item.posterPath, "w342");
  const href = item.movieId
    ? normalizeMediaType(item.mediaType) === "tv"
      ? `/tv/${item.movieId}`
      : `/movie/${item.movieId}`
    : null;
  const content = (
    <>
      <div className="relative aspect-2/3 bg-neutral-900">
        {poster ? (
          <Image src={poster} alt={item.movieTitle} fill sizes="(min-width: 768px) 20vw, 45vw" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-neutral-700"><Film className="h-8 w-8" /></div>
        )}
      </div>
      <div className="p-3">
        <h3 className="truncate text-sm font-semibold text-white">{item.movieTitle}</h3>
        <p className="mt-1 text-xs text-neutral-400">{formatDate(item.watchedAt)}</p>
        {item.note && <p className="mt-2 line-clamp-2 text-xs leading-5 text-neutral-400">{item.note}</p>}
      </div>
    </>
  );
  const className = "kin-focus block overflow-hidden rounded-sm border border-white/10 bg-neutral-900/45 transition-colors hover:border-gold/40";
  return href ? <Link href={href} className={className}>{content}</Link> : <div className={className}>{content}</div>;
}

function CompactReview({ review }: { review: ReviewItem }) {
  return (
    <Link href="/reviews" className="kin-focus group block border-b border-white/10 py-4 transition-colors last:border-b-0 hover:bg-neutral-900/25">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-lg font-semibold text-white group-hover:text-gold">{review.movieTitle}</h3>
        {review.spoiler && <span className="rounded-full border border-yellow-500/20 bg-yellow-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-yellow-300">Spoiler</span>}
      </div>
      <p className={`mt-3 line-clamp-3 text-sm leading-6 text-neutral-400 ${review.spoiler ? "select-none blur-sm" : ""}`}>{review.body}</p>
    </Link>
  );
}

function CompactList({ list }: { list: MovieListItem }) {
  return (
    <Link href={`/lists/${list._id}`} className="kin-focus group block border-b border-white/10 py-4 transition-colors last:border-b-0 hover:bg-neutral-900/25">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-lg font-semibold text-white group-hover:text-gold">{list.title}</h3>
        <span className="shrink-0 text-xs text-neutral-400">{list.movies.length} titles</span>
      </div>
      {list.description && <p className="mt-3 line-clamp-2 text-sm leading-6 text-neutral-400">{list.description}</p>}
    </Link>
  );
}

function OverviewPanel({ data }: { data: Awaited<ReturnType<typeof getProfileOverview>> }) {
  return (
    <div className="space-y-8">
      <section id="overview" aria-labelledby="overview-heading">
        <h2 id="overview-heading" className="sr-only">Profile overview</h2>
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
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-white/10 pb-4 text-xs text-neutral-400">
          {[
            { label: "watch logs", value: data.watchLogCount, href: "/profile?tab=journal" },
            { label: "watchlist", value: data.watchlistCount, href: "/profile?tab=watchlist" },
            { label: "reviews", value: data.reviewCount, href: "/profile?tab=reviews" },
            { label: "lists", value: data.listCount, href: "/profile?tab=lists" },
          ].map((item) => (
            <Link key={item.label} href={item.href} className="kin-focus rounded-sm transition-colors hover:text-gold">
              <span className="font-display text-base text-white">{item.value}</span> {item.label}
            </Link>
          ))}
        </div>
      </section>

      <ProfilePanel id="recent" eyebrow="Last watched" title="Recent titles" action={{ href: "/profile?tab=journal", label: "View journal" }}>
        {data.recentJournal.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{data.recentJournal.map((item) => <JournalCard key={item._id} item={item} />)}</div>
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

  if (tab === "overview") {
    panel = <OverviewPanel data={await getProfileOverview(email)} />;
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
  } else if (tab === "favorites") {
    const result = await getFavoritePage(email, requestedPage);
    panel = (
      <ProfilePanel id="favorites" eyebrow="Personal shelf" title="Favorites" description="Rate the titles you love and keep your personal ratings up to date.">
        {result.total ? <ProfileFavorites initialFavorites={result.items} /> : <EmptyState compact title="No favorites yet" description="Add movies and shows to build your personal shelf." />}
        <ProfilePagination tab={tab} page={result.page} totalPages={result.totalPages} total={result.total} pageSize={PROFILE_PAGE_SIZES.favorites} />
      </ProfilePanel>
    );
  } else if (tab === "watchlist") {
    const result = await getWatchlistPage(email, requestedPage);
    panel = (
      <ProfilePanel id="watchlist" eyebrow="Up next" title="Watchlist" description="The movies and shows you are planning to watch next.">
        {result.total ? <WatchlistGrid items={result.items} /> : <EmptyState compact title="Your watchlist is empty" description="Add titles from any movie or show page." />}
        <ProfilePagination tab={tab} page={result.page} totalPages={result.totalPages} total={result.total} pageSize={PROFILE_PAGE_SIZES.watchlist} />
      </ProfilePanel>
    );
  } else if (tab === "reviews") {
    const result = await getReviewPage(email, requestedPage);
    panel = (
      <ProfilePanel id="reviews" eyebrow="Writing archive" title="Reviews" description="Your public and private reviews across every title.">
        {result.total ? <div className="grid gap-4 xl:grid-cols-2">{result.items.map((review) => <ReviewCard key={review._id} review={review} rating={result.ratingMap.get(mediaKey(review.mediaType, review.movieId)) || 0} currentUserEmail={email} path="/profile" />)}</div> : <EmptyState compact title="No reviews yet" description="Write your first review from a movie or show page." />}
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
  } else {
    const result = await getJournalPage(email, requestedPage);
    panel = (
      <ProfilePanel id="journal" eyebrow="Watch log" title="Journal" description="Dates, notes, and the history behind your titles-watched metrics." action={{ href: "/journal", label: "Open journal" }}>
        {result.total ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{result.items.map((item) => <JournalCard key={item._id} item={item} />)}</div> : <EmptyState compact title="Your journal is empty" description="Log your first watch to begin your history." />}
        <ProfilePagination tab={tab} page={result.page} totalPages={result.totalPages} total={result.total} pageSize={PROFILE_PAGE_SIZES.journal} />
      </ProfilePanel>
    );
  }

  const relationships = await relationshipPromise;
  return (
    <div className="min-h-screen px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
      <div className="mx-auto max-w-6xl">
        <ProfileHeader
          name={identity.name || sessionName || "KinOrbia user"}
          username={identity.username}
          bio={identity.bio}
          image={identity.image || sessionImage}
          createdAt={identity.createdAt}
          followers={relationships.followers}
          following={relationships.following}
        >
          {identity.username && <Link href={`/u/${encodeURIComponent(identity.username)}`} className="kin-focus inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-neutral-300 transition hover:border-gold/30 hover:text-white"><ExternalLink className="h-4 w-4" />Public profile</Link>}
          <ProfileActions user={{ name: identity.name || sessionName || "KinOrbia user", bio: identity.bio || "", username: identity.username }} />
          <a href="/api/user/export" className="kin-focus inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-neutral-300 transition hover:border-gold/30 hover:text-white"><Download className="h-4 w-4" />Export data</a>
        </ProfileHeader>

        <div className="sticky top-20 z-30 -mx-4 mt-5 border-y border-white/10 bg-neutral-950/95 px-4 py-2 backdrop-blur-xl sm:mx-0 sm:px-0">
          <ProfileTabs current={tab} year={selectedYear} />
        </div>

        <div className="mt-8">{panel}</div>
      </div>
    </div>
  );
}

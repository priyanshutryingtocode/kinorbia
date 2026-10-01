import { Suspense } from "react";
import PosterImage from "@/components/PosterImage";
import Link from "next/link";
import LinkTabs from "@/components/LinkTabs";
import {BarChart3, Clapperboard, Film, Star, TrendingUp, type LucideIcon} from "lucide-react";
import EmptyState from "@/components/EmptyState";
import ProfileCommunityComparison from "@/components/ProfileCommunityComparison";
import ProfileMetricRail from "@/components/ProfileMetricRail";
import type { InsightsData } from "@/lib/insights";

import type { FavoriteMovie } from "@/types";

type ProfileInsightsProps = {
  insights: InsightsData;
  years: number[];
  selectedYear?: number;
  favorites: FavoriteMovie[];
  userEmail: string;
};

const EYEBROW_CLASS = "kin-overline text-highlight/80";
const HEADING_CLASS = "mt-2 flex items-center gap-2 font-display text-2xl font-medium text-content";

function InsightHeading({
  id,
  eyebrow,
  title,
  icon: Icon,
  iconClassName,
}: {
  id: string;
  eyebrow: string;
  title: string;
  icon: LucideIcon;
  iconClassName: string;
}) {
  return (
    <>
      <p className={EYEBROW_CLASS}>{eyebrow}</p>
      <h3 id={id} className={HEADING_CLASS}>
        <Icon className={iconClassName} aria-hidden="true" />
        {title}
      </h3>
    </>
  );
}

// `activeItem` is a string, so "Overall" needs a key that cannot collide with a
// year. `selectedYear` is a number or undefined, so this never does.
const OVERALL_KEY = "overall";

function yearHref(year?: number) {
  if (!year) {
    return "/profile?tab=insights";
  }
  return `/profile?tab=insights&year=${year}`;
}

function MonthlyWatchChart({ data, headingId }: { data: InsightsData; headingId: string }) {
  const width = 720;
  const height = 230;
  const paddingX = 28;
  const paddingTop = 24;
  const paddingBottom = 38;
  const plotHeight = height - paddingTop - paddingBottom;
  const plotWidth = width - paddingX * 2;
  const max = Math.max(1, ...data.monthly.map((point) => point.count));
  const points = data.monthly.map((point, index) => ({
    ...point,
    x: paddingX + (index / Math.max(1, data.monthly.length - 1)) * plotWidth,
    y: paddingTop + plotHeight - (point.count / max) * plotHeight,
  }));
  const line = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
  const lastPoint = points.at(-1);
  const area = `${line} L${lastPoint?.x ?? paddingX},${paddingTop + plotHeight} L${paddingX},${paddingTop + plotHeight} Z`;
  const chartId = `${headingId}-chart`;
  const areaId = `${chartId}-area`;
  const summary = data.monthly.map((point) => `${point.key}: ${point.count}`).join(", ");

  return (
    <figure aria-labelledby={headingId}>
      <div
        className="kin-focus w-full overflow-x-auto rounded-sm pb-2"
        role="region"
        aria-label="Scrollable monthly activity chart"
        tabIndex={0}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          className="block h-auto min-w-[640px] w-full"
          role="img"
          aria-labelledby={chartId}
          aria-describedby={`${chartId}-summary`}
        >
          <title id={chartId}>Monthly watch-log activity</title>
          <desc id={`${chartId}-summary`}>{summary}</desc>
          {[0, 0.5, 1].map((ratio) => {
            const y = paddingTop + plotHeight - ratio * plotHeight;
            return (
              <g key={ratio} aria-hidden="true">
                <line
                  x1={paddingX}
                  x2={width - paddingX}
                  y1={y}
                  y2={y}
                  stroke="rgba(255,255,255,0.08)"
                  strokeDasharray="4 6"
                />
                <text x={paddingX - 8} y={y + 4} textAnchor="end" fill="#737373" fontSize="11">
                  {Math.round(max * ratio)}
                </text>
              </g>
            );
          })}
          <path d={area} fill={`url(#${areaId})`} aria-hidden="true" />
          <path
            d={line}
            fill="none"
            stroke="#ef4444"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          />
          {points.map((point) => (
            <g key={point.key} className="group">
              <title>{`${point.key}: ${point.count} watch logs`}</title>
              <circle
                cx={point.x}
                cy={point.y}
                r="8"
                fill="#0a0a0a"
                stroke="#f87171"
                strokeWidth="3"
                aria-hidden="true"
              />
              <g className="pointer-events-none opacity-0 transition group-hover:opacity-100" aria-hidden="true">
                <rect
                  x={Math.min(width - 78, Math.max(4, point.x - 32))}
                  y={Math.max(2, point.y - 38)}
                  width="64"
                  height="26"
                  rx="8"
                  fill="#171717"
                  stroke="rgba(255,255,255,0.12)"
                />
                <text
                  x={Math.min(width - 46, Math.max(36, point.x))}
                  y={Math.max(19, point.y - 21)}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize="12"
                  fontWeight="700"
                >
                  {point.count}
                </text>
              </g>
              <text
                x={point.x}
                y={height - 12}
                textAnchor="middle"
                fill="#737373"
                fontSize="11"
                aria-hidden="true"
              >
                {point.label}
              </text>
            </g>
          ))}
          <defs>
            <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <details className="mt-4 border-t border-rule pt-3 text-xs text-content-muted">
        <summary className="kin-focus w-fit cursor-pointer rounded-sm hover:text-content">View data table</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left">
            <caption className="sr-only">Monthly watch-log activity data</caption>
            <thead>
              <tr>
                <th scope="col" className="py-2 pr-4 font-medium">Month</th>
                <th scope="col" className="py-2 font-medium">Watch logs</th>
              </tr>
            </thead>
            <tbody>
              {data.monthly.map((point) => (
                <tr key={point.key} className="border-t border-glass-line">
                  <td className="py-2 pr-4">{point.key}</td>
                  <td className="py-2">{point.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

function RatingBars({ data }: { data: InsightsData }) {
  const rated = data.ratingDistribution.reduce((sum, bucket) => sum + bucket.count, 0);
  const max = Math.max(1, ...data.ratingDistribution.map((bucket) => bucket.count));

  if (rated === 0) {
    return <p className="text-sm text-content-muted">Rate favorites to build your rating distribution.</p>;
  }

  return (
    <div className="space-y-3">
      {data.ratingDistribution.map((bucket) => (
        <div key={bucket.stars} className="grid grid-cols-[3rem_1fr_2.5rem] items-center gap-3 text-sm">
          <span className="text-content-muted">{bucket.stars} star</span>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-glass-hover"
            role="progressbar"
            aria-label={`${bucket.stars} star ratings`}
            aria-valuemin={0}
            aria-valuemax={max}
            aria-valuenow={bucket.count}
          >
            <div className="h-full rounded-full bg-highlight/80" style={{ width: `${(bucket.count / max) * 100}%` }} />
          </div>
          <span className="text-right text-content">{bucket.count}</span>
        </div>
      ))}
    </div>
  );
}

function MediaSplit({ data }: { data: InsightsData }) {
  const total = data.moviesWatched + data.showsWatched;
  if (total === 0) {
    return <p className="text-sm text-content-muted">Your watched-title mix appears here after your first journal entry.</p>;
  }

  const moviePercent = (data.moviesWatched / total) * 100;
  return (
    <div>
      <div
        className="flex h-2 overflow-hidden rounded-full bg-glass-hover"
        role="img"
        aria-label={`${data.moviesWatched} movies and ${data.showsWatched} shows`}
      >
        <div className="bg-highlight" style={{ width: `${moviePercent}%` }} />
        <div className="bg-accent-hover" style={{ width: `${100 - moviePercent}%` }} />
      </div>
      <div className="mt-4 grid grid-cols-2 divide-x divide-rule border-y border-rule">
        <div className="py-3 pr-4 sm:pr-6">
          <p className="font-display text-2xl font-medium leading-none text-highlight">{data.moviesWatched}</p>
          <p className="mt-1 text-xs uppercase tracking-wider text-content-muted">Movies · {Math.round(moviePercent)}%</p>
        </div>
        <div className="py-3 pl-4 sm:pl-6">
          <p className="font-display text-2xl font-medium leading-none text-red-200">{data.showsWatched}</p>
          <p className="mt-1 text-xs uppercase tracking-wider text-content-muted">Shows · {Math.round(100 - moviePercent)}%</p>
        </div>
      </div>
    </div>
  );
}

function CommunitySkeleton() {
  return (
    <section className="py-8" aria-busy="true">
      <span className="sr-only">Loading community comparison</span>
      <div className="h-3 w-28 animate-pulse bg-surface-raised" aria-hidden="true" />
      <div className="mt-3 h-7 w-56 animate-pulse bg-surface-raised" aria-hidden="true" />
      <div className="mt-6 divide-y divide-rule" aria-hidden="true">
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex items-center gap-4 py-3">
            <div className="h-12 w-8 shrink-0 animate-pulse bg-surface-raised" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-2/3 animate-pulse bg-surface-raised" />
              <div className="h-2 w-1/3 animate-pulse bg-surface" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function ProfileInsights({
  insights,
  years,
  selectedYear,
  favorites,
  userEmail,
}: ProfileInsightsProps) {
  const uniqueTitles = insights.moviesWatched + insights.showsWatched;
  const ratedCount = insights.ratingDistribution.reduce((sum, bucket) => sum + bucket.count, 0);
  const maxGenre = Math.max(1, ...insights.genreBreakdown.map((genre) => genre.count));
  const hasData = uniqueTitles > 0 || insights.totalWatches > 0 || ratedCount > 0 || insights.genreBreakdown.length > 0;

  return (
    <div className="space-y-0">
      {years.length > 0 && (
        // Was a third hand-rolled tab bar, with the <Link> written out twice --
        // once for "Overall", once per year -- and drifting the same way the
        // profile tabs did. LinkTabs takes the items as data.
        <LinkTabs
          ariaLabel="Insight year"
          activeItem={selectedYear === undefined ? OVERALL_KEY : String(selectedYear)}
          items={[
            { key: OVERALL_KEY, label: "Overall", href: yearHref() },
            ...years.map((year) => ({
              key: String(year),
              label: String(year),
              href: yearHref(year),
            })),
          ]}
        />
      )}

      {!hasData ? (
        <div className="mt-6">
          <EmptyState
            compact
            title={selectedYear ? `No activity recorded for ${selectedYear}` : "Your insights start here"}
            description={selectedYear ? "Choose another year or return to overall insights." : "Log a watch or rate a favorite to build your personal statistics."}
          >
            <Link href={selectedYear ? "/profile?tab=insights" : "/"} className="kin-focus rounded-sm text-sm font-semibold text-red-300 hover:text-red-200">
              {selectedYear ? "View overall insights" : "Browse titles"}
            </Link>
          </EmptyState>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <ProfileMetricRail
            ariaLabel="Insight summary"
            metrics={[
              {
                label: "Unique titles",
                value: uniqueTitles.toString(),
                detail: "Movies and shows combined",
              },
              {
                label: "Watch logs",
                value: insights.totalWatches.toString(),
                detail: "Journal entries in this period",
                emphasis: "red",
              },
              {
                label: "Current streak",
                value: `${insights.currentStreak} days`,
                detail: `Best: ${insights.bestStreak} days`,
              },
              {
                label: "Average rating",
                value: insights.averageRating.toFixed(1),
                detail: `${ratedCount} rated ${ratedCount === 1 ? "favorite" : "favorites"}`,
                emphasis: "gold",
              },
            ]}
          />

          <div className="divide-y divide-rule">
            <section className="py-8" aria-labelledby="watch-activity-heading">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <InsightHeading
                    id="watch-activity-heading"
                    eyebrow="Watch rhythm"
                    title="Monthly activity"
                    icon={BarChart3}
                    iconClassName="h-5 w-5 text-red-300"
                  />
                </div>
                {insights.bestMonthLabel && (
                  <p className="text-xs text-content-muted">
                    Busiest month: <span className="font-semibold text-content">{insights.bestMonthLabel}</span>
                  </p>
                )}
              </div>
              <MonthlyWatchChart data={insights} headingId="watch-activity-heading" />
            </section>

            <div className="grid xl:grid-cols-2 xl:divide-x xl:divide-rule">
              <section className="border-b border-rule py-8 xl:border-b-0 xl:pr-8" aria-labelledby="rating-distribution-heading">
                <InsightHeading
                  id="rating-distribution-heading"
                  eyebrow="Favorite ratings"
                  title="Rating distribution"
                  icon={Star}
                  iconClassName="h-5 w-5 text-highlight"
                />
                <div className="mt-6">
                  <RatingBars data={insights} />
                </div>
              </section>

              <section className="py-8 xl:pl-8" aria-labelledby="media-mix-heading">
                <InsightHeading
                  id="media-mix-heading"
                  eyebrow="Your library"
                  title="Movies vs shows"
                  icon={Clapperboard}
                  iconClassName="h-5 w-5 text-red-300"
                />
                <div className="mt-6">
                  <MediaSplit data={insights} />
                </div>
              </section>
            </div>

            {insights.genreBreakdown.length > 0 && (
              <section className="py-8" aria-labelledby="favorite-genres-heading">
                <div className="mb-5 flex items-end justify-between gap-4">
                  <div>
                    <InsightHeading
                      id="favorite-genres-heading"
                      eyebrow="Taste profile"
                      title="Favorite genres"
                      icon={Film}
                      iconClassName="h-5 w-5 text-highlight"
                    />
                  </div>
                  {insights.topGenre && (
                    <p className="text-xs text-content-muted">
                      Top: <span className="font-semibold text-content">{insights.topGenre}</span>
                    </p>
                  )}
                </div>
                <div className="space-y-3">
                  {insights.genreBreakdown.map((genre) => (
                    <div key={genre.name} className="grid grid-cols-[minmax(6rem,10rem)_1fr_3rem] items-center gap-3 text-sm">
                      <span className="truncate text-content" title={genre.name}>{genre.name}</span>
                      <div className="h-1.5 overflow-hidden rounded-full bg-glass-hover">
                        <div className="h-full rounded-full bg-highlight/75" style={{ width: `${(genre.count / maxGenre) * 100}%` }} />
                      </div>
                      <span className="text-right text-content-muted">{genre.count}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {insights.topRated.length > 0 && (
              <section className="py-8" aria-labelledby="top-rated-heading">
                <InsightHeading
                  id="top-rated-heading"
                  eyebrow="Personal picks"
                  title="Top rated"
                  icon={TrendingUp}
                  iconClassName="h-5 w-5 text-highlight"
                />
                <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
                  {insights.topRated.map((item) => (
                    <Link
                      key={`${item.mediaType}-${item.movieId}`}
                      href={item.href}
                      className="kin-focus group block min-w-0 border-b border-rule pb-3 transition-colors hover:border-highlight/50"
                    >
                      <div className="relative aspect-2/3 overflow-hidden bg-surface-raised">
                        {/* Called tmdbImage twice in one expression and cast the second
                            result with `as string`. That cast was suppressing a real null:
                            tmdbImage rejects any host other than image.tmdb.org and re-sizes an
                            already-absolute TMDB url, so the guard could pass and the src could
                            still come back null. */}
                        <PosterImage
                          path={item.posterPath}
                          width="w185"
                          alt={item.title}
                          sizes="(min-width: 1024px) 18vw, (min-width: 640px) 30vw, 45vw"
                          className="object-cover transition group-hover:scale-[1.03]"
                        />
                        <span className="absolute right-2 top-2 inline-flex items-center gap-1 bg-black/75 px-2 py-1 text-xs font-bold text-on-scrim">
                          <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                          {(item.rating / 2).toFixed(1)}
                        </span>
                      </div>
                      <p className="mt-3 truncate text-sm font-medium text-content">{item.title}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {!selectedYear && (
              <Suspense fallback={<CommunitySkeleton />}>
                <ProfileCommunityComparison favorites={favorites} userEmail={userEmail} />
              </Suspense>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

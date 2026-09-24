import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { BarChart3, Clapperboard, Film, Star, TrendingUp } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import ProfileCommunityComparison from "@/components/ProfileCommunityComparison";
import ProfileMetricRail from "@/components/ProfileMetricRail";
import type { InsightsData } from "@/lib/insights";
import { tmdbImage } from "@/lib/media";
import type { FavoriteMovie } from "@/types";

type ProfileInsightsProps = {
  insights: InsightsData;
  years: number[];
  selectedYear?: number;
  favorites: FavoriteMovie[];
  userEmail: string;
};

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
      <details className="mt-4 border-t border-white/10 pt-3 text-xs text-neutral-400">
        <summary className="kin-focus w-fit cursor-pointer rounded-sm hover:text-neutral-300">View data table</summary>
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
                <tr key={point.key} className="border-t border-white/5">
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
    return <p className="text-sm text-neutral-400">Rate favorites to build your rating distribution.</p>;
  }

  return (
    <div className="space-y-3">
      {data.ratingDistribution.map((bucket) => (
        <div key={bucket.stars} className="grid grid-cols-[3rem_1fr_2.5rem] items-center gap-3 text-sm">
          <span className="text-neutral-400">{bucket.stars} star</span>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-white/8"
            role="progressbar"
            aria-label={`${bucket.stars} star ratings`}
            aria-valuemin={0}
            aria-valuemax={max}
            aria-valuenow={bucket.count}
          >
            <div className="h-full rounded-full bg-gold/80" style={{ width: `${(bucket.count / max) * 100}%` }} />
          </div>
          <span className="text-right text-neutral-300">{bucket.count}</span>
        </div>
      ))}
    </div>
  );
}

function MediaSplit({ data }: { data: InsightsData }) {
  const total = data.moviesWatched + data.showsWatched;
  if (total === 0) {
    return <p className="text-sm text-neutral-400">Your watched-title mix appears here after your first journal entry.</p>;
  }

  const moviePercent = (data.moviesWatched / total) * 100;
  return (
    <div>
      <div
        className="flex h-2 overflow-hidden rounded-full bg-white/8"
        role="img"
        aria-label={`${data.moviesWatched} movies and ${data.showsWatched} shows`}
      >
        <div className="bg-gold" style={{ width: `${moviePercent}%` }} />
        <div className="bg-red-500" style={{ width: `${100 - moviePercent}%` }} />
      </div>
      <div className="mt-4 grid grid-cols-2 divide-x divide-white/10 border-y border-white/10">
        <div className="py-3 pr-4 sm:pr-6">
          <p className="font-display text-2xl font-medium leading-none text-gold">{data.moviesWatched}</p>
          <p className="mt-1 text-xs uppercase tracking-wider text-neutral-400">Movies · {Math.round(moviePercent)}%</p>
        </div>
        <div className="py-3 pl-4 sm:pl-6">
          <p className="font-display text-2xl font-medium leading-none text-red-200">{data.showsWatched}</p>
          <p className="mt-1 text-xs uppercase tracking-wider text-neutral-400">Shows · {Math.round(100 - moviePercent)}%</p>
        </div>
      </div>
    </div>
  );
}

function CommunitySkeleton() {
  return (
    <section className="py-8" aria-busy="true">
      <span className="sr-only">Loading community comparison</span>
      <div className="h-3 w-28 animate-pulse bg-white/10" aria-hidden="true" />
      <div className="mt-3 h-7 w-56 animate-pulse bg-white/10" aria-hidden="true" />
      <div className="mt-6 divide-y divide-white/10" aria-hidden="true">
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex items-center gap-4 py-3">
            <div className="h-12 w-8 shrink-0 animate-pulse bg-neutral-900" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-2/3 animate-pulse bg-white/10" />
              <div className="h-2 w-1/3 animate-pulse bg-white/5" />
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
        <nav aria-label="Insight year" className="overflow-x-auto border-b border-white/10">
          <div className="flex flex-wrap items-stretch sm:min-w-max sm:flex-nowrap">
            <Link
              href={yearHref()}
              aria-current={!selectedYear ? "page" : undefined}
              className={`kin-focus -mb-px whitespace-nowrap border-b-2 px-3 py-2 text-xs font-semibold tracking-wide transition-colors ${
                !selectedYear
                  ? "border-red-500 text-red-100"
                  : "border-transparent text-neutral-400 hover:border-white/20 hover:text-neutral-200"
              }`}
            >
              Overall
            </Link>
            {years.map((year) => (
              <Link
                key={year}
                href={yearHref(year)}
                aria-current={selectedYear === year ? "page" : undefined}
                className={`kin-focus -mb-px whitespace-nowrap border-b-2 px-3 py-2 text-xs font-semibold tracking-wide transition-colors ${
                  selectedYear === year
                    ? "border-red-500 text-red-100"
                    : "border-transparent text-neutral-400 hover:border-white/20 hover:text-neutral-200"
                }`}
              >
                {year}
              </Link>
            ))}
          </div>
        </nav>
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

          <div className="divide-y divide-white/10">
            <section className="py-8" aria-labelledby="watch-activity-heading">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="profile-overline text-gold/80">Watch rhythm</p>
                  <h3 id="watch-activity-heading" className="mt-2 flex items-center gap-2 font-display text-2xl font-medium text-white">
                    <BarChart3 className="h-5 w-5 text-red-300" aria-hidden="true" />
                    Monthly activity
                  </h3>
                </div>
                {insights.bestMonthLabel && (
                  <p className="text-xs text-neutral-400">
                    Busiest month: <span className="font-semibold text-neutral-300">{insights.bestMonthLabel}</span>
                  </p>
                )}
              </div>
              <MonthlyWatchChart data={insights} headingId="watch-activity-heading" />
            </section>

            <div className="grid xl:grid-cols-2 xl:divide-x xl:divide-white/10">
              <section className="border-b border-white/10 py-8 xl:border-b-0 xl:pr-8" aria-labelledby="rating-distribution-heading">
                <p className="profile-overline text-gold/80">Favorite ratings</p>
                <h3 id="rating-distribution-heading" className="mt-2 flex items-center gap-2 font-display text-2xl font-medium text-white">
                  <Star className="h-5 w-5 text-gold" aria-hidden="true" />
                  Rating distribution
                </h3>
                <div className="mt-6">
                  <RatingBars data={insights} />
                </div>
              </section>

              <section className="py-8 xl:pl-8" aria-labelledby="media-mix-heading">
                <p className="profile-overline text-gold/80">Your library</p>
                <h3 id="media-mix-heading" className="mt-2 flex items-center gap-2 font-display text-2xl font-medium text-white">
                  <Clapperboard className="h-5 w-5 text-red-300" aria-hidden="true" />
                  Movies vs shows
                </h3>
                <div className="mt-6">
                  <MediaSplit data={insights} />
                </div>
              </section>
            </div>

            {insights.genreBreakdown.length > 0 && (
              <section className="py-8" aria-labelledby="favorite-genres-heading">
                <div className="mb-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="profile-overline text-gold/80">Taste profile</p>
                    <h3 id="favorite-genres-heading" className="mt-2 flex items-center gap-2 font-display text-2xl font-medium text-white">
                      <Film className="h-5 w-5 text-gold" aria-hidden="true" />
                      Favorite genres
                    </h3>
                  </div>
                  {insights.topGenre && (
                    <p className="text-xs text-neutral-400">
                      Top: <span className="font-semibold text-neutral-300">{insights.topGenre}</span>
                    </p>
                  )}
                </div>
                <div className="space-y-3">
                  {insights.genreBreakdown.map((genre) => (
                    <div key={genre.name} className="grid grid-cols-[minmax(6rem,10rem)_1fr_3rem] items-center gap-3 text-sm">
                      <span className="truncate text-neutral-300" title={genre.name}>{genre.name}</span>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                        <div className="h-full rounded-full bg-gold/75" style={{ width: `${(genre.count / maxGenre) * 100}%` }} />
                      </div>
                      <span className="text-right text-neutral-400">{genre.count}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {insights.topRated.length > 0 && (
              <section className="py-8" aria-labelledby="top-rated-heading">
                <p className="profile-overline text-gold/80">Personal picks</p>
                <h3 id="top-rated-heading" className="mt-2 flex items-center gap-2 font-display text-2xl font-medium text-white">
                  <TrendingUp className="h-5 w-5 text-gold" aria-hidden="true" />
                  Top rated
                </h3>
                <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
                  {insights.topRated.map((item) => (
                    <Link
                      key={`${item.mediaType}-${item.movieId}`}
                      href={item.href}
                      className="kin-focus group block min-w-0 border-b border-white/10 pb-3 transition-colors hover:border-gold/50"
                    >
                      <div className="relative aspect-2/3 overflow-hidden bg-neutral-900">
                        {tmdbImage(item.posterPath, "w185") ? (
                          <Image
                            src={tmdbImage(item.posterPath, "w185") as string}
                            alt={item.title}
                            fill
                            sizes="(min-width: 1024px) 18vw, (min-width: 640px) 30vw, 45vw"
                            className="object-cover transition group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-neutral-700" aria-hidden="true">
                            <Film className="h-6 w-6" />
                          </div>
                        )}
                        <span className="absolute right-2 top-2 inline-flex items-center gap-1 bg-black/75 px-2 py-1 text-xs font-bold text-gold">
                          <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                          {(item.rating / 2).toFixed(1)}
                        </span>
                      </div>
                      <p className="mt-3 truncate text-sm font-medium text-neutral-200">{item.title}</p>
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

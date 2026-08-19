"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  BarChart3,
  Calendar,
  Clapperboard,
  Film,
  Flame,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import type { InsightsData } from "@/lib/insights";
import type { CommunityComparison } from "@/lib/community";

function posterUrl(path?: string | null) {
  return path ? `https://image.tmdb.org/t/p/w92${path}` : null;
}

function InsightCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-white/5 bg-neutral-900/50 p-4">
      <div className="shrink-0 rounded-full bg-white/5 p-3">{icon}</div>
      <div className="min-w-0">
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-xs uppercase tracking-wider text-neutral-500">{label}</div>
      </div>
    </div>
  );
}

function BarRow({
  label,
  count,
  max,
  barClass,
  display,
}: {
  label: string;
  count: number;
  max: number;
  barClass: string;
  display: string;
}) {
  const width = max > 0 ? Math.max(4, Math.round((count / max) * 100)) : 0;

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-12 shrink-0 text-neutral-400">{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/5">
        <div className={`h-full rounded-full ${barClass} transition-all`} style={{ width: `${width}%` }} />
      </div>
      <span className="w-8 shrink-0 text-right text-neutral-300">{display}</span>
    </div>
  );
}

type ProfileInsightsProps = {
  insights: InsightsData;
  byYear: Record<string, InsightsData>;
  years: number[];
  community?: CommunityComparison | null;
};

export default function ProfileInsights({
  insights,
  byYear,
  years,
  community,
}: ProfileInsightsProps) {
  const [selected, setSelected] = useState<string>("overall");
  const data = selected === "overall" ? insights : byYear[selected] ?? insights;

  const {
    totalWatches,
    moviesWatched,
    showsWatched,
    averageRating,
    monthly,
    currentStreak,
    bestStreak,
    ratingDistribution,
    topRated,
    movieCount,
    showCount,
    genreBreakdown,
    bestMonthLabel,
    topGenre,
  } = data;

  const maxMonthly = Math.max(1, ...monthly.map((point) => point.count));
  const maxStars = Math.max(1, ...ratingDistribution.map((bucket) => bucket.count));
  const maxType = Math.max(1, movieCount, showCount);
  const maxGenre = Math.max(1, ...genreBreakdown.map((genre) => genre.count));

  const tabs = [{ key: "overall", label: "Overall" }, ...years.map((year) => ({ key: String(year), label: String(year) }))];

  return (
    <div className="space-y-6">
      {tabs.length > 1 && (
        <div className="flex w-fit items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSelected(tab.key)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                selected === tab.key
                  ? "bg-red-500/12 text-red-200 ring-1 ring-red-500/25"
                  : "text-neutral-400 hover:bg-white/7 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <InsightCard icon={<Film className="h-5 w-5 text-blue-400" />} label="Total Watches" value={totalWatches.toString()} />
        <InsightCard icon={<Calendar className="h-5 w-5 text-red-400" />} label="Current Streak" value={`${currentStreak} days`} />
        <InsightCard icon={<Flame className="h-5 w-5 text-orange-400" />} label="Best Streak" value={`${bestStreak} days`} />
        <InsightCard icon={<Star className="h-5 w-5 text-yellow-400" />} label="Avg Stars" value={averageRating ? averageRating.toFixed(1) : "0.0"} />
      </div>

      <div className="rounded-xl border border-white/10 bg-neutral-900/40 p-5">
        <h4 className="mb-5 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-neutral-400">
          <BarChart3 className="h-4 w-4 text-red-400" />
          Watches per Month
        </h4>
        <div className="flex h-36 items-end gap-1.5 sm:gap-2">
          {monthly.map((point, index) => (
            <div key={index} className="group relative flex flex-1 flex-col items-center gap-1">
              <span className="pointer-events-none absolute -top-7 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-white opacity-0 backdrop-blur transition group-hover:opacity-100">
                {point.count}
              </span>
              <div
                className={`w-full rounded-t-md transition-all ${
                  point.count > 0 ? "bg-gradient-to-t from-red-600 to-red-400" : "bg-white/5"
                }`}
                style={{ height: `${Math.max(3, (point.count / maxMonthly) * 100)}%` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-1.5 sm:gap-2">
          {monthly.map((point, index) => (
            <span key={index} className="flex-1 truncate text-center text-[10px] text-neutral-500">
              {point.label}
            </span>
          ))}
        </div>
        {bestMonthLabel && (
          <p className="mt-3 text-xs text-neutral-500">
            Busiest month: <span className="font-bold text-neutral-300">{bestMonthLabel}</span>
          </p>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-neutral-900/40 p-5">
          <h4 className="mb-5 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-neutral-400">
            <Star className="h-4 w-4 text-yellow-400" />
            Rating Distribution
          </h4>
          <div className="space-y-2.5">
            {ratingDistribution.map((bucket) => (
              <BarRow
                key={bucket.stars}
                label={`${bucket.stars}★`}
                count={bucket.count}
                max={maxStars}
                display={bucket.count.toString()}
                barClass="bg-yellow-500/80"
              />
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-neutral-900/40 p-5">
          <h4 className="mb-5 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-neutral-400">
            <Clapperboard className="h-4 w-4 text-blue-400" />
            Movies vs Shows
          </h4>
          <div className="space-y-2.5">
            <BarRow label="Movies" count={movieCount} max={maxType} display={`${movieCount} / ${moviesWatched}`} barClass="bg-blue-500/80" />
            <BarRow label="Shows" count={showCount} max={maxType} display={`${showCount} / ${showsWatched}`} barClass="bg-red-500/80" />
          </div>
        </div>
      </div>

      {genreBreakdown.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-neutral-900/40 p-5">
          <h4 className="mb-5 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-neutral-400">
            <Film className="h-4 w-4 text-emerald-400" />
            Top Genres
            {topGenre && <span className="ml-auto font-normal normal-case text-neutral-500">Top: {topGenre}</span>}
          </h4>
          <div className="space-y-2.5">
            {genreBreakdown.map((genre) => (
              <BarRow
                key={genre.name}
                label={genre.name.slice(0, 10)}
                count={genre.count}
                max={maxGenre}
                display={genre.count.toString()}
                barClass="bg-emerald-500/80"
              />
            ))}
          </div>
        </div>
      )}

      {topRated.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-neutral-900/40 p-5">
          <h4 className="mb-5 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-neutral-400">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            Top Rated
          </h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {topRated.map((item) => (
              <Link
                key={`${item.mediaType}-${item.movieId}`}
                href={item.href}
                className="group overflow-hidden rounded-lg border border-white/10 bg-neutral-950 transition hover:border-red-500/40"
              >
                <div className="relative aspect-2/3 bg-neutral-900">
                  {posterUrl(item.posterPath) ? (
                    <Image
                      src={posterUrl(item.posterPath) as string}
                      alt={item.title}
                      fill
                      sizes="(min-width: 1024px) 20vw, 40vw"
                      className="object-cover transition group-hover:opacity-80"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-neutral-700">
                      <Film className="h-6 w-6" />
                    </div>
                  )}
                  <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-xs font-bold text-yellow-400 backdrop-blur">
                    <Star className="h-3 w-3 fill-current" />
                    {(item.rating / 2).toFixed(1)}
                  </div>
                </div>
                <p className="truncate px-3 py-2 text-xs font-medium text-neutral-200">{item.title}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {selected === "overall" && community && (
        <div className="rounded-xl border border-white/10 bg-neutral-900/40 p-5">
          <h4 className="mb-5 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-neutral-400">
            <Users className="h-4 w-4 text-purple-400" />
            You vs the Community
          </h4>
          {community.overallCommunityAvg !== null && (
            <div className="mb-5 grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-white/10 bg-neutral-950/60 p-4 text-center">
                <p className="text-2xl font-bold text-yellow-400">{averageRating ? averageRating.toFixed(1) : "0.0"}</p>
                <p className="mt-1 text-xs uppercase tracking-wider text-neutral-500">Your avg stars</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-neutral-950/60 p-4 text-center">
                <p className="text-2xl font-bold text-purple-400">{community.overallCommunityAvg.toFixed(1)}</p>
                <p className="mt-1 text-xs uppercase tracking-wider text-neutral-500">Community avg</p>
              </div>
            </div>
          )}
          <div className="space-y-2">
            {community.items.map((item) => (
              <div key={`${item.mediaType}-${item.movieId}`} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-neutral-950/60 px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  {item.posterPath && (
                    <div className="relative h-12 w-8 shrink-0 overflow-hidden rounded bg-neutral-900">
                      <Image src={posterUrl(item.posterPath) as string} alt={item.title} fill sizes="32px" className="object-cover" />
                    </div>
                  )}
                  <Link href={item.mediaType === "tv" ? `/tv/${item.movieId}` : `/movie/${item.movieId}`} className="truncate text-sm font-medium text-neutral-200 hover:text-red-400 transition">
                    {item.title}
                  </Link>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-xs">
                  <span className="font-bold text-yellow-400">{item.yours.toFixed(1)}</span>
                  <span className="text-neutral-600">vs</span>
                  <span className="font-bold text-purple-400">{item.community ? item.community.toFixed(1) : "—"}</span>
                  <span className={`font-bold ${item.delta > 0 ? "text-emerald-400" : item.delta < 0 ? "text-red-400" : "text-neutral-500"}`}>
                    {item.delta > 0 ? "+" : ""}{item.delta.toFixed(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
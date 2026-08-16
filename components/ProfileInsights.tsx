import Link from "next/link";
import Image from "next/image";
import { BarChart3, Calendar, Flame, Star, Clapperboard, Film, TrendingUp } from "lucide-react";
import type { InsightsData } from "@/lib/insights";

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
    <div className="bg-neutral-900/50 border border-white/5 p-4 rounded-xl flex items-center gap-4">
      <div className="p-3 bg-white/5 rounded-full shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-xs text-neutral-500 uppercase tracking-wider">{label}</div>
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

export default function ProfileInsights({ insights }: { insights: InsightsData }) {
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
  } = insights;

  const maxMonthly = Math.max(1, ...monthly.map((point) => point.count));
  const maxStars = Math.max(1, ...ratingDistribution.map((bucket) => bucket.count));
  const maxType = Math.max(1, movieCount, showCount);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InsightCard
          icon={<Film className="w-5 h-5 text-blue-400" />}
          label="Total Watches"
          value={totalWatches.toString()}
        />
        <InsightCard
          icon={<Calendar className="w-5 h-5 text-red-400" />}
          label="Current Streak"
          value={`${currentStreak} days`}
        />
        <InsightCard
          icon={<Flame className="w-5 h-5 text-orange-400" />}
          label="Best Streak"
          value={`${bestStreak} days`}
        />
        <InsightCard
          icon={<Star className="w-5 h-5 text-yellow-400" />}
          label="Avg Stars"
          value={averageRating ? averageRating.toFixed(1) : "0.0"}
        />
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
            <BarRow
              label="Movies"
              count={movieCount}
              max={maxType}
              display={`${movieCount} / ${moviesWatched}`}
              barClass="bg-blue-500/80"
            />
            <BarRow
              label="Shows"
              count={showCount}
              max={maxType}
              display={`${showCount} / ${showsWatched}`}
              barClass="bg-red-500/80"
            />
          </div>
        </div>
      </div>

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
                      className="object-cover group-hover:opacity-80 transition"
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
    </div>
  );
}
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUp, Minus, Users } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { buildCommunityComparison } from "@/lib/community";
import { tmdbImage } from "@/lib/media";
import type { FavoriteMovie } from "@/types";

type ProfileCommunityComparisonProps = {
  favorites: FavoriteMovie[];
  userEmail: string;
};

function DeltaIcon({ delta }: { delta: number }) {
  if (delta > 0) {
    return <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />;
  }
  if (delta < 0) {
    return <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />;
  }
  return <Minus className="h-3.5 w-3.5" aria-hidden="true" />;
}

export default async function ProfileCommunityComparison({
  favorites,
  userEmail,
}: ProfileCommunityComparisonProps) {
  let community;

  try {
    community = await buildCommunityComparison(favorites, userEmail);
  } catch (error) {
    console.error("Failed to build community comparison:", error);
    return (
      <div role="status">
        <EmptyState
          title="Community comparison is unavailable"
          description="Your other profile insights are still available. Try again later."
        />
      </div>
    );
  }

  if (!community) {
    return null;
  }

  return (
    <section aria-labelledby="community-heading" className="premium-card rounded-panel p-5 sm:p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-gold">Shared taste</p>
          <h3 id="community-heading" className="flex items-center gap-2 font-display text-xl font-bold text-white">
            <Users className="h-5 w-5 text-purple-300" aria-hidden="true" />
            You vs the community
          </h3>
        </div>
        <p className="text-xs text-neutral-500">
          {community.communityRatingCount || 0} community ratings across {community.comparableCount || 0} titles
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-card border border-white/10 bg-neutral-950/60 p-4 text-center">
          <p className="font-display text-3xl font-bold text-yellow-300">{community.userComparableAvg.toFixed(1)}</p>
          <p className="mt-1 text-xs uppercase tracking-wider text-neutral-500">Your comparable average</p>
        </div>
        <div className="rounded-card border border-white/10 bg-neutral-950/60 p-4 text-center">
          <p className="font-display text-3xl font-bold text-purple-300">
            {community.overallCommunityAvg?.toFixed(1) || "—"}
          </p>
          <p className="mt-1 text-xs uppercase tracking-wider text-neutral-500">Average community title rating</p>
        </div>
      </div>

      <div className="space-y-4">
        {community.items.map((item) => {
          const poster = tmdbImage(item.posterPath, "w92");
          const deltaLabel = item.delta > 0 ? "higher" : item.delta < 0 ? "lower" : "the same";
          return (
            <article key={`${item.mediaType}-${item.movieId}`} className="rounded-card border border-white/10 bg-neutral-950/45 p-4">
              <div className="mb-3 flex min-w-0 items-center gap-3">
                {poster && (
                  <div className="relative h-12 w-8 shrink-0 overflow-hidden rounded-md bg-neutral-900">
                    <Image src={poster} alt="" fill sizes="32px" className="object-cover" />
                  </div>
                )}
                <Link
                  href={item.mediaType === "tv" ? `/tv/${item.movieId}` : `/movie/${item.movieId}`}
                  className="kin-focus min-w-0 flex-1 truncate rounded-sm font-semibold text-white transition hover:text-gold"
                >
                  {item.title}
                </Link>
                <span className="shrink-0 text-xs text-neutral-500">n={item.count}</span>
              </div>
              <div className="flex items-center gap-3" aria-label={`Your rating ${item.yours.toFixed(1)}, community rating ${item.community?.toFixed(1)}, ${deltaLabel}`}>
                <div className="relative h-2 flex-1 rounded-full bg-white/8">
                  <span className="absolute inset-y-0 left-0 w-1/5 rounded-full bg-white/5" />
                  <span
                    className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-neutral-950 bg-yellow-300 shadow"
                    style={{ left: `${(item.yours / 5) * 100}%` }}
                    aria-hidden="true"
                  />
                  <span
                    className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-neutral-950 bg-purple-300 shadow"
                    style={{ left: `${((item.community || 0) / 5) * 100}%` }}
                    aria-hidden="true"
                  />
                </div>
                <span className="w-24 shrink-0 text-right text-xs font-semibold text-neutral-300">
                  {item.yours.toFixed(1)} vs {item.community?.toFixed(1)}
                </span>
                <span
                  className={`inline-flex w-16 shrink-0 items-center justify-end gap-1 text-xs font-bold ${
                    item.delta > 0 ? "text-emerald-300" : item.delta < 0 ? "text-red-300" : "text-neutral-400"
                  }`}
                >
                  <DeltaIcon delta={item.delta} />
                  {item.delta > 0 ? "+" : ""}{item.delta.toFixed(1)}
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

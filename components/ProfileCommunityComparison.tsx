import TmdbPosterImage from "@/components/TmdbPosterImage";
import Link from "next/link";
import { ArrowDown, ArrowUp, Minus, Users } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { buildCommunityComparison } from "@/lib/community";
import { mediaHref, tmdbImage } from "@/lib/media";
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
          compact
          title="Community comparison is unavailable"
          description="Your other profile insights are still available. Try again later."
        />
      </div>
    );
  }

  if (!community) {
    return null;
  }

  const overallCommunityAvg =
    community.overallCommunityAvg === null ? "—" : community.overallCommunityAvg.toFixed(1);

  return (
    <section aria-labelledby="community-heading" className="py-8">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="kin-overline text-gold/80">Shared taste</p>
          <h3 id="community-heading" className="flex items-center gap-2 font-display text-2xl font-medium text-white">
            <Users className="h-5 w-5 text-gold" aria-hidden="true" />
            You vs the community
          </h3>
        </div>
        <p className="text-xs text-neutral-400">
          {community.communityRatingCount || 0} community ratings across {community.comparableCount || 0} titles
        </p>
      </div>

      <div className="grid grid-cols-2 divide-x divide-white/10 border-y border-white/10">
        <div className="py-4 pr-4 sm:pr-6">
          <p className="kin-overline text-neutral-400">You</p>
          <p className="mt-1 font-display text-2xl font-medium leading-none text-gold">
            {community.userComparableAvg.toFixed(1)}
          </p>
          <p className="mt-1 text-xs text-neutral-400">Comparable average</p>
        </div>
        <div className="py-4 pl-4 sm:pl-6">
          <p className="kin-overline text-neutral-400">Community</p>
          <p className="mt-1 font-display text-2xl font-medium leading-none text-white">{overallCommunityAvg}</p>
          <p className="mt-1 text-xs text-neutral-400">Average title rating</p>
        </div>
      </div>

      <div
        className="kin-focus mt-5 overflow-x-auto rounded-sm"
        role="region"
        aria-label="Scrollable community rating comparison"
        tabIndex={0}
      >
        <table className="w-full min-w-[32rem] border-collapse text-sm">
          <caption className="sr-only">Your ratings compared with community ratings</caption>
          <thead>
            <tr className="border-b border-white/10">
              <th scope="col" className="min-w-[13rem] pb-3 pr-4 text-left font-medium text-neutral-400">Title</th>
              <th scope="col" className="px-2 pb-3 text-right font-medium text-gold">You</th>
              <th scope="col" className="px-2 pb-3 text-right font-medium text-neutral-300">Community</th>
              <th scope="col" className="pb-3 pl-2 text-right font-medium text-neutral-300">Difference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {community.items.map((item) => {
              const poster = tmdbImage(item.posterPath, "w92");
              const communityRating = item.community === null ? "—" : item.community.toFixed(1);
              const deltaLabel = item.delta > 0 ? "higher" : item.delta < 0 ? "lower" : "the same";
              const deltaClass =
                item.delta > 0 ? "text-gold" : item.delta < 0 ? "text-red-300" : "text-neutral-400";

              return (
                <tr key={`${item.mediaType}-${item.movieId}`}>
                  <th scope="row" className="py-3 pr-4 text-left font-normal">
                    <div className="flex min-w-0 items-center gap-3">
                      {poster && (
                        <div className="relative h-12 w-8 shrink-0 overflow-hidden bg-neutral-900">
                          <TmdbPosterImage src={poster} alt="" fill sizes="32px" className="object-cover" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <Link
                          href={mediaHref(item.mediaType, item.movieId)}
                          className="kin-focus block truncate rounded-sm font-semibold text-white transition hover:text-gold"
                        >
                          {item.title}
                        </Link>
                        <p className="mt-1 text-xs text-neutral-400">Based on {item.count} ratings</p>
                      </div>
                    </div>
                  </th>
                  <td
                    className="whitespace-nowrap px-2 text-right font-semibold text-gold"
                    aria-label={`Your rating ${item.yours.toFixed(1)} out of 5`}
                  >
                    {item.yours.toFixed(1)}
                  </td>
                  <td
                    className="whitespace-nowrap px-2 text-right font-semibold text-neutral-200"
                    aria-label={`Community rating ${item.community === null ? "unavailable" : `${communityRating} out of 5`}`}
                  >
                    {communityRating}
                  </td>
                  <td
                    className={`whitespace-nowrap py-3 pl-2 text-right font-semibold ${deltaClass}`}
                    aria-label={`Difference ${deltaLabel}: ${item.delta > 0 ? "+" : ""}${item.delta.toFixed(1)}`}
                  >
                    <span className="inline-flex items-center justify-end gap-1">
                      <DeltaIcon delta={item.delta} />
                      {item.delta > 0 ? "+" : ""}{item.delta.toFixed(1)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

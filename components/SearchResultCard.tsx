import Link from "next/link";
import PosterImage from "@/components/PosterImage";
import { mediaHref, normalizeMediaType, yearOf } from "@/lib/media";
import type { MovieSummary } from "@/types";

// Extracted from the search page's inline result markup so the first page and
// the appended pages render identically.
//
// Deliberately not `MovieCard`: this is a poster *plus caption* row and
// MovieCard is a bare tile, so mixing the two would make the appended rows look
// different from the ones above them. The overlay is the shared part -- both now
// draw PosterBadges, so the year and rating are consistent wherever a poster
// carries them. They are simply not repeated here, where the caption underneath
// already states the year.
export default function SearchResultCard({ movie }: { movie: MovieSummary }) {
  const mediaType = normalizeMediaType(movie.mediaType);
  const releaseYear = yearOf(movie.release_date);
  const href = mediaHref(mediaType, movie.id);

  return (
    <li>
      <Link
        href={href}
        className="kin-focus group block overflow-hidden rounded-control border border-rule bg-surface-raised transition-colors hover:border-highlight/40"
        aria-label={`${movie.title} (${releaseYear}, ${mediaType === "tv" ? "TV show" : "movie"})`}
      >
        <div className="relative aspect-2/3 overflow-hidden bg-surface-raised">
          <PosterImage
            path={movie.poster_path}
            width="w500"
            alt=""
            sizes="(min-width: 1024px) 20vw, (min-width: 768px) 25vw, 50vw"
            className="object-cover transition-opacity group-hover:opacity-80"
          />
        </div>
        <div className="p-3">
          <h3 className="truncate font-display text-base font-medium text-content transition-colors group-hover:text-highlight">
            {movie.title}
          </h3>
          <p className="mt-1 text-xs text-content-subtle">{releaseYear}</p>
        </div>
      </Link>
    </li>
  );
}

import Link from "next/link";
import PosterImage from "@/components/PosterImage";
import { mediaHref, normalizeMediaType, yearOf } from "@/lib/media";
import type { MovieSummary } from "@/types";

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

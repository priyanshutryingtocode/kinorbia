import Link from "next/link";
import PosterImage from "@/components/PosterImage";
import { Star } from "lucide-react";
import { mediaHref } from "@/lib/media";
import type { MovieSummary } from "@/types";

// Not to be merged with SearchResultCard, the inline posters in
// `app/(root)/lists/[id]/page.tsx` and `app/(root)/u/[username]/page.tsx`, or
// MovieCarousel's. They look like one component and are three: this is a poster
// *tile* with the rating overlaid and a hover lift, SearchResultCard and
// ListPoster are poster *plus caption* rows, and CarouselPoster is a bare image
// with no chrome. Compared line by line the two caption cards differ in image
// `sizes`, `alt`, hover opacity, fallback icon size, background, padding, title
// classes and caption wording -- unifying them needs roughly eight override
// props and buys one component that expresses none of them well. The duplicated
// part worth sharing is the poster-or-fallback image itself, not the card.
export type MovieProp = MovieSummary;

export default function MovieCard({
  movie,
  index,
  loading,
  onRateClick,
}: {
  movie: MovieProp;
  index?: number;
  loading?: "eager" | "lazy";
  onRateClick?: (movie: MovieProp) => void;
}) {
  const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : "N/A";
  const href = mediaHref(movie.mediaType, movie.id);
  const isEager = loading ? loading === "eager" : index !== undefined && index < 3;
  // Was a <Film> with no size class, so a missing poster rendered at lucide's
  // 24px default while every other surface used 28-40px.
  const posterElement = (
    <PosterImage
      path={movie.poster_path}
      width="w500"
      alt={movie.title}
      eager={isEager}
      sizes="(min-width: 1024px) 20vw, (min-width: 768px) 25vw, 50vw"
      className="object-cover transition duration-500 group-hover:saturate-110"
    />
  );

  return (
    <div className="group relative overflow-hidden rounded-sheet border border-rule bg-canvas shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-rule-strong hover:shadow-card-hover">
      <Link
        href={href}
        prefetch={index === undefined ? undefined : index < 3}
        className="kin-focus relative block aspect-2/3 overflow-hidden bg-surface-raised"
        aria-label={`${movie.title} (${releaseYear})`}
      >
        {posterElement}
        <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/8" />
        <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 rounded-full border border-rule bg-black/55 px-2 py-0.5 backdrop-blur-md sm:top-2 sm:right-2 sm:gap-1 sm:px-2.5 sm:py-1">
          <Star className="h-2.5 w-2.5 fill-highlight text-highlight sm:h-3 sm:w-3" />
          <span className="text-[10px] font-medium text-on-scrim sm:text-xs">{movie.vote_average.toFixed(1)}</span>
        </div>
      </Link>

      {movie.personalRating !== undefined && (
        <button
          onClick={() => onRateClick?.(movie)}
          aria-label={`Rate ${movie.title}`}
          aria-haspopup={onRateClick ? "dialog" : undefined}
          className={`kin-focus absolute bottom-2 left-2 z-10 flex items-center gap-1 rounded-full border border-rule px-2.5 py-1 text-xs font-bold backdrop-blur-md transition-colors ${
            movie.personalRating > 0
              ? "bg-highlight/12 text-highlight hover:bg-highlight/20"
              : "bg-black/55 text-on-scrim hover:bg-surface-raised hover:text-content"
          }`}
        >
          <Star className={`w-3 h-3 ${movie.personalRating > 0 ? "fill-current" : ""}`} />
          <span>{movie.personalRating > 0 ? `${(movie.personalRating / 2).toFixed(1)}` : "Rate"}</span>
        </button>
      )}
    </div>
  );
}

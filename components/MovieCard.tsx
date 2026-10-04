import Link from "next/link";
import PosterImage from "@/components/PosterImage";
import PosterBadges from "@/components/PosterBadges";
import { Star } from "lucide-react";
import { mediaHref, starsLabel, yearOf } from "@/lib/media";
import type { MovieSummary } from "@/types";
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
  const releaseYear = yearOf(movie.release_date);
  const href = mediaHref(movie.mediaType, movie.id);
  const isEager = loading ? loading === "eager" : index !== undefined && index < 3;
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
    <div className="group relative overflow-hidden rounded-sheet border border-rule bg-canvas shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-highlight-muted/70 hover:shadow-card-hover">
      <Link
        href={href}
        prefetch={index === undefined ? undefined : index < 3}
        className="kin-focus relative block aspect-2/3 overflow-hidden bg-surface-raised"
        aria-label={`${movie.title} (${releaseYear})`}
      >
        {posterElement}
        <div className="absolute inset-0 bg-scrim/0 transition-colors duration-300 group-hover:bg-scrim/8" />
        <PosterBadges year={releaseYear} rating={movie.vote_average} />
      </Link>

      {movie.personalRating !== undefined && (
        <button
          onClick={() => onRateClick?.(movie)}
          aria-label={`Rate ${movie.title}`}
          aria-haspopup={onRateClick ? "dialog" : undefined}
          className={`kin-focus absolute bottom-2 left-2 z-10 flex items-center gap-1 rounded-full border border-rule px-2.5 py-1 text-xs font-bold backdrop-blur-md transition-colors ${
            movie.personalRating > 0
              ? "bg-highlight/12 text-highlight hover:bg-highlight/20"
              : "bg-scrim/55 text-on-scrim hover:bg-surface-raised hover:text-content"
          }`}
        >
          <Star className={`w-3 h-3 ${movie.personalRating > 0 ? "fill-current" : ""}`} />
          <span>{movie.personalRating > 0 ? `${starsLabel(movie.personalRating)}` : "Rate"}</span>
        </button>
      )}
    </div>
  );
}

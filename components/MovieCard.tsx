import Link from "next/link";
import Image from "next/image";
import { Film, Star } from "lucide-react";
import type { MovieSummary } from "@/types";

export type MovieProp = MovieSummary;

export default function MovieCard({
  movie,
  onRateClick,
}: {
  movie: MovieProp;
  onRateClick?: (movie: MovieProp) => void;
}) {
  const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : "N/A";

  return (
    <div className="group relative overflow-hidden rounded-lg border border-white/8 bg-neutral-950 shadow-[0_18px_45px_-34px_rgba(0,0,0,0.95)] transition-all hover:-translate-y-1 hover:border-white/18 hover:shadow-[0_24px_60px_-42px_rgba(220,38,38,0.45)]">
      <Link
        href={`/movie/${movie.id}`}
        className="kin-focus relative block aspect-2/3 overflow-hidden bg-neutral-900"
        aria-label={`${movie.title} (${releaseYear})`}
      >
        {movie.poster_path ? (
          <Image
            src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
            alt={movie.title}
            fill
            sizes="(min-width: 1024px) 20vw, (min-width: 768px) 25vw, 50vw"
            className="object-cover transition duration-500 group-hover:scale-[1.025] group-hover:saturate-110"
          />
        ) : (
          <div className="h-full bg-neutral-900 flex items-center justify-center">
            <Film className="text-neutral-600" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/8" />
        <div className="absolute top-2 left-2 rounded-full border border-white/10 bg-black/55 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-md">
          {releaseYear}
        </div>
        <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full border border-white/10 bg-black/55 px-2.5 py-1 backdrop-blur-md">
          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
          <span className="text-xs font-medium text-white">{movie.vote_average.toFixed(1)}</span>
        </div>
      </Link>

      {movie.personalRating !== undefined && (
        <button
          onClick={() => onRateClick?.(movie)}
          className={`kin-focus absolute bottom-2 left-2 z-10 flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-xs font-bold backdrop-blur-md transition-colors ${
            movie.personalRating > 0
              ? "bg-yellow-400/12 text-yellow-300 hover:bg-yellow-400/20"
              : "bg-black/55 text-neutral-300 hover:bg-white/10 hover:text-white"
          }`}
        >
          <Star className={`w-3 h-3 ${movie.personalRating > 0 ? "fill-current" : ""}`} />
          <span>{movie.personalRating > 0 ? `${movie.personalRating}/10` : "Rate"}</span>
        </button>
      )}
    </div>
  );
}

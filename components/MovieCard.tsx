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
  return (
    <div className="group relative bg-neutral-900 border border-white/5 rounded-xl overflow-hidden shadow-lg hover:shadow-red-900/20 transition-all hover:-translate-y-1 flex flex-col">
      <Link href={`/movie/${movie.id}`} className="aspect-2/3 relative overflow-hidden block">
        {movie.poster_path ? (
          <Image
            src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
            alt={movie.title}
            fill
            sizes="(min-width: 1024px) 20vw, (min-width: 768px) 25vw, 50vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="h-full bg-neutral-800 flex items-center justify-center">
            <Film className="text-neutral-600" />
          </div>
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
          <p className="text-red-400 font-bold text-sm tracking-widest uppercase">View Details</p>
        </div>
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md border border-white/10 px-2 py-1 rounded-lg flex items-center gap-1">
          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
          <span className="text-xs font-medium text-white">{movie.vote_average.toFixed(1)}</span>
        </div>
      </Link>

      <div className="p-4 flex-1 flex flex-col justify-between">
        <h3 className="text-white font-medium truncate group-hover:text-red-500 transition-colors">
          {movie.title}
        </h3>

        <div className="mt-2 flex items-center justify-between">
          {movie.personalRating !== undefined ? (
            <button
              onClick={() => onRateClick?.(movie)}
              className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md transition-colors ${
                movie.personalRating > 0
                  ? "text-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/20"
                  : "text-neutral-400 bg-white/5 hover:bg-white/10"
              }`}
            >
              <Star className={`w-3 h-3 ${movie.personalRating > 0 ? "fill-current" : ""}`} />
              <span>
                {movie.personalRating > 0 ? `${movie.personalRating}/10` : "Rate this"}
              </span>
            </button>
          ) : (
            <p className="text-neutral-500 text-xs">
              {movie.release_date ? new Date(movie.release_date).getFullYear() : "N/A"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

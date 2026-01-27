import Link from "next/link";
import { Star } from "lucide-react";

export interface MovieProp {
  id: number;
  title: string;
  poster_path: string;
  release_date: string;
  vote_average: number;
}

export default function MovieCard({ movie, index }: { movie: MovieProp; index: number }) {
  return (
    <Link
      href={`/movie/${movie.id}`}
      className="group relative bg-neutral-900 border border-white/5 rounded-xl overflow-hidden shadow-lg hover:shadow-red-900/20 transition-all hover:-translate-y-1"
    >
      {/* Image Container */}
      <div className="aspect-2/3 relative overflow-hidden">
        <img
          src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
          alt={movie.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        
        {/* Hover Gradient Overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
          <p className="text-red-400 font-bold text-sm tracking-widest uppercase">View Details</p>
        </div>

        {/* Rating Badge */}
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md border border-white/10 px-2 py-1 rounded-lg flex items-center gap-1">
          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
          <span className="text-xs font-medium text-white">{movie.vote_average.toFixed(1)}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-white font-medium truncate group-hover:text-red-500 transition-colors">
          {movie.title}
        </h3>
        <p className="text-neutral-500 text-xs mt-1">
          {movie.release_date ? new Date(movie.release_date).getFullYear() : "N/A"}
        </p>
      </div>
    </Link>
  );
}
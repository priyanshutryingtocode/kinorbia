"use client";

import { useState } from "react";
import { Loader2, Star } from "lucide-react";
import { useRouter } from "next/navigation";

type MovieRatingControlProps = {
  movie: {
    id: string;
    title: string;
    poster_path: string | null;
    vote_average: number;
    release_date?: string;
  };
  initialRating: number;
};

export default function MovieRatingControl({ movie, initialRating }: MovieRatingControlProps) {
  const [rating, setRating] = useState(initialRating);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const rateMovie = async (nextRating: number) => {
    setLoading(true);

    try {
      const res = await fetch("/api/user/rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movieId: movie.id,
          movieTitle: movie.title,
          posterPath: movie.poster_path,
          voteAverage: movie.vote_average,
          releaseDate: movie.release_date,
          rating: nextRating,
        }),
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (res.ok) {
        setRating(nextRating);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Star className="w-5 h-5 text-yellow-400 fill-current" />
        <span className="text-sm font-medium text-neutral-300">
          {rating > 0 ? `Your rating: ${rating}/10` : "Rate this movie"}
        </span>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />}
      </div>
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => rateMovie(value)}
            disabled={loading}
            className={`w-9 h-9 rounded-full border text-xs font-bold transition ${
              rating === value
                ? "bg-yellow-500 border-yellow-400 text-black"
                : "bg-white/5 border-white/10 text-neutral-400 hover:border-yellow-500 hover:text-yellow-400"
            }`}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}

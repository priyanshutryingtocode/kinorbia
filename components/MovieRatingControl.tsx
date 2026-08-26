"use client";

import { useState } from "react";
import { Loader2, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "./ToastProvider";

type MovieRatingControlProps = {
  movie: {
    id: string;
    title: string;
    poster_path: string | null;
    vote_average: number;
    release_date?: string;
    mediaType?: "movie" | "tv";
    genre_ids?: number[];
  };
  initialRating: number;
};

export default function MovieRatingControl({ movie, initialRating }: MovieRatingControlProps) {
  const [rating, setRating] = useState(initialRating);
  const [draftStars, setDraftStars] = useState(initialRating > 0 ? initialRating / 2 : 2.5);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();
  const savedStars = rating > 0 ? rating / 2 : 0;
  const stars = [1, 2, 3, 4, 5];

  const rateMovie = async (nextStars: number) => {
    const nextRating = Math.round(nextStars * 2);
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
          mediaType: movie.mediaType || "movie",
          genreIds: movie.genre_ids || [],
        }),
      });

      if (res.status === 401) {
        showToast("Sign in to rate movies.", "info");
        router.push("/login");
        return;
      }

      if (res.ok) {
        setRating(nextRating);
        setDraftStars(nextStars);
        showToast(`Rated ${nextStars.toFixed(1)} stars.`, "success");
        router.refresh();
      } else {
        showToast("Could not save your rating.", "error");
      }
    } catch {
      showToast("Could not save your rating.", "error");
    } finally {
      setLoading(false);
    }
  };

return (
    <div className="flex min-w-0 flex-1 flex-col items-stretch gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:rounded-full sm:px-3 sm:py-2">
      <div className="flex items-center justify-between gap-2 sm:shrink-0 sm:justify-start">
        <div className="flex shrink-0 items-center gap-2">
          <Star className="h-4 w-4 fill-current text-yellow-400" />
          <span className="text-sm font-medium text-neutral-300">
            {rating > 0 ? `${savedStars.toFixed(1)} stars` : "Rate"}
          </span>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-yellow-400" />}
        </div>

        <span className="shrink-0 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1 text-sm font-bold text-yellow-300 sm:hidden">
          {draftStars.toFixed(1)}
        </span>
      </div>

      <div className="relative h-9 w-full min-w-30 flex-1">
        <div className="flex h-full items-center justify-center gap-1 sm:justify-start">
          {stars.map((star) => {
            const fillPercent = Math.max(0, Math.min(1, draftStars - (star - 1))) * 100;

            return (
              <span key={star} className="relative h-6 w-6 text-neutral-700">
                <Star className="h-6 w-6 fill-current" />
                <span
                  className="absolute inset-y-0 left-0 overflow-hidden text-yellow-400"
                  style={{ width: `${fillPercent}%` }}
                >
                  <Star className="h-6 w-6 fill-current" />
                </span>
              </span>
            );
          })}
        </div>
        <input
          type="range"
          min="0.5"
          max="5"
          step="0.5"
          value={draftStars}
          onChange={(event) => setDraftStars(Number(event.target.value))}
          disabled={loading}
          className="kin-focus absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          aria-label="Choose your star rating"
        />
      </div>

      <span className="hidden shrink-0 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1 text-sm font-bold text-yellow-300 sm:inline-block">
        {draftStars.toFixed(1)}
      </span>

      <button
        type="button"
        onClick={() => rateMovie(draftStars)}
        disabled={loading || Math.round(draftStars * 2) === rating}
        className="kin-focus w-full shrink-0 rounded-full border border-white/10 bg-white/7 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:py-1.5"
      >
        Save
      </button>
    </div>
  );
}

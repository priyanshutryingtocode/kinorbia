"use client";

import { useState } from "react";
import type { DetailSummary } from "@/lib/mediaDetail";
import { Eye, Loader2, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "./ToastProvider";
import { normalizeMediaType } from "@/lib/media";
import { useSignInGuard } from "@/lib/useSignInGuard";

type MovieRatingControlProps = {
  movie: DetailSummary;
  initialRating: number;
  isWatched: boolean;
};

export default function MovieRatingControl({ movie, initialRating, isWatched }: MovieRatingControlProps) {
  const [rating, setRating] = useState(initialRating);
  const [draftStars, setDraftStars] = useState(initialRating > 0 ? initialRating / 2 : 2.5);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();
  const signInGuard = useSignInGuard();
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
          mediaType: normalizeMediaType(movie.mediaType),
          genreIds: movie.genre_ids || [],
        }),
      });

      if (signInGuard(res, "Sign in to rate movies.")) {
        return;
      }

      if (res.ok) {
        setRating(nextRating);
        setDraftStars(nextStars);
        showToast(`Rated ${nextStars.toFixed(1)} stars.`, "success");
        router.refresh();
        return;
      }

      const data = await res.json().catch(() => null);
      showToast(data?.message || "Could not save your rating.", "error");
    } catch {
      showToast("Could not save your rating.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!isWatched) {
    return (
      <p className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-rule bg-surface px-4 py-3 text-sm text-content-muted">
        <Eye className="h-4 w-4 shrink-0" aria-hidden="true" />
        Mark this as watched to rate it.
      </p>
    );
  }

return (
    <div className="flex min-w-0 flex-1 flex-col items-stretch gap-3 rounded-overlay border border-rule bg-surface p-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:rounded-full sm:px-3 sm:py-2">
      <div className="flex items-center justify-between gap-2 sm:shrink-0 sm:justify-start">
        <div className="flex shrink-0 items-center gap-2">
          <Star className="h-4 w-4 fill-current text-highlight-muted" />
          <span className="text-sm font-medium text-content">
            {rating > 0 ? `${savedStars.toFixed(1)} stars` : "Rate"}
          </span>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-highlight-muted" />}
        </div>

        <span className="shrink-0 rounded-full border border-highlight-muted/20 bg-highlight-muted/10 px-3 py-1 text-sm font-bold text-highlight-muted sm:hidden">
          {draftStars.toFixed(1)}
        </span>
      </div>

      <div className="relative h-9 w-full min-w-30 flex-1">
        <div className="flex h-full items-center justify-center gap-1 sm:justify-start">
          {stars.map((star) => {
            const fillPercent = Math.max(0, Math.min(1, draftStars - (star - 1))) * 100;

            return (
              <span key={star} className="relative h-6 w-6 text-content-subtle">
                <Star className="h-6 w-6 fill-current" />
                <span
                  className="absolute inset-y-0 left-0 overflow-hidden text-highlight-muted"
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

      <span className="hidden shrink-0 rounded-full border border-highlight-muted/20 bg-highlight-muted/10 px-3 py-1 text-sm font-bold text-highlight-muted sm:inline-block">
        {draftStars.toFixed(1)}
      </span>

      <button
        type="button"
        onClick={() => rateMovie(draftStars)}
        disabled={loading || Math.round(draftStars * 2) === rating}
        className="kin-focus w-full shrink-0 rounded-full border border-rule bg-glass-strong px-3 py-2 text-sm font-semibold text-content transition hover:bg-glass-strong disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:py-1.5"
      >
        Save
      </button>
    </div>
  );
}

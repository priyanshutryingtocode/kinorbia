"use client";

import { movieRefPayload } from "@/lib/mediaDetail";
import { useState } from "react";
import type { DetailSummary } from "@/lib/mediaDetail";
import { Eye, Loader2, Star } from "lucide-react";
import StarRating from "@/components/StarRating";
import { useRouter } from "next/navigation";
import { useToast } from "./ToastProvider";
import { useSignInGuard } from "@/lib/useSignInGuard";

type MovieRatingControlProps = {
  movie: DetailSummary;
  initialRating: number;
  isWatched: boolean;
};

export default function MovieRatingControl({ movie, initialRating, isWatched }: MovieRatingControlProps) {
  const [rating, setRating] = useState(initialRating);
  const [draftStars, setDraftStars] = useState(initialRating > 0 ? initialRating / 2 : 2.5);
  // An unrated title seeds at 2.5, which maps to a real score (5 of 10). Without this, Save was
  // live on load and one click wrote a rating the member never picked.
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();
  const signInGuard = useSignInGuard();
  const savedStars = rating > 0 ? rating / 2 : 0;

  const rateMovie = async (nextStars: number) => {
    const nextRating = Math.round(nextStars * 2);
    setLoading(true);

    try {
      const res = await fetch("/api/user/rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...movieRefPayload(movie), rating: nextRating }),
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

      <StarRating
        value={draftStars}
        onChange={(stars) => {
          setDraftStars(stars);
          setTouched(true);
        }}
        label="Choose your star rating"
        disabled={loading}
        className="flex-1"
      />

      <span className="hidden shrink-0 rounded-full border border-highlight-muted/20 bg-highlight-muted/10 px-3 py-1 text-sm font-bold text-highlight-muted sm:inline-block">
        {draftStars.toFixed(1)}
      </span>

      <button
        type="button"
        onClick={() => rateMovie(draftStars)}
        disabled={loading || !touched || Math.round(draftStars * 2) === rating}
        className="kin-focus w-full shrink-0 rounded-full border border-rule bg-glass-strong px-3 py-2 text-sm font-semibold text-content transition hover:bg-glass-strong disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:py-1.5"
      >
        Save
      </button>
    </div>
  );
}

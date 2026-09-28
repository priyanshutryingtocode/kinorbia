"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Film, Loader2, Star, X } from "lucide-react";
import MovieCard, { type MovieProp } from "@/components/MovieCard";
import AccessibleDialog from "@/components/AccessibleDialog";
import { useToast } from "@/components/ToastProvider";
import { mediaKey, normalizeMediaType } from "@/lib/media";
import type { FavoriteMovie } from "@/types";

export default function ProfileFavorites({ initialFavorites }: { initialFavorites: FavoriteMovie[] }) {
  const [selectedMovie, setSelectedMovie] = useState<MovieProp | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { showToast } = useToast();

  const closeDialog = useCallback(() => {
    if (!loading) {
      setSelectedMovie(null);
      setError("");
    }
  }, [loading]);

  const handleRate = async (rating: number) => {
    if (!selectedMovie) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Same endpoint the film pages and the diary use. The server requires a
      // diary entry before it will store a rating, so a favorite that has never
      // been watched comes back 409 with its own message and we surface that
      // rather than inventing one here.
      const res = await fetch("/api/user/rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movieId: selectedMovie.id,
          movieTitle: selectedMovie.title,
          posterPath: selectedMovie.poster_path,
          rating,
          mediaType: normalizeMediaType(selectedMovie.mediaType),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message || "Could not update this rating.");
        showToast(data?.message || "Could not update this rating.", "error");
        return;
      }

      showToast(`Updated your rating for ${selectedMovie.title}.`, "success");
      setSelectedMovie(null);
      router.refresh();
    } catch {
      setError("Could not update this rating. Please try again.");
      showToast("Could not update this rating.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (initialFavorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-sm border-y border-dashed border-rule bg-white/[0.02] px-6 py-10 text-center text-content-subtle">
        <Film className="h-12 w-12 opacity-30" aria-hidden="true" />
        <p>You have not added any favorites yet.</p>
        <Link href="/" className="kin-focus rounded-sm text-sm font-semibold text-red-300 transition hover:text-red-200">
          Browse movies and shows
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {initialFavorites.map((favorite, index) => (
          <MovieCard
            key={mediaKey(favorite.mediaType, favorite.movieId)}
            index={index}
            movie={{
              id: favorite.movieId,
              title: favorite.title,
              poster_path: favorite.posterPath,
              vote_average: favorite.voteAverage,
              release_date: favorite.releaseDate,
              personalRating: favorite.personalRating || 0,
              mediaType: normalizeMediaType(favorite.mediaType),
            }}
            onRateClick={setSelectedMovie}
          />
        ))}
      </div>

      <AccessibleDialog
        open={Boolean(selectedMovie)}
        onClose={closeDialog}
        titleId="rate-title-dialog"
        className="max-w-sm"
      >
        {selectedMovie && (
          <>
            <button
              type="button"
              onClick={closeDialog}
              disabled={loading}
              className="kin-focus absolute right-4 top-4 rounded-full border border-rule bg-surface p-2 text-content-muted transition hover:text-content disabled:opacity-50"
              aria-label="Close rating dialog"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="pr-10 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Your rating</p>
              <h2 id="rate-title-dialog" className="mt-1 font-display text-2xl font-medium text-content">
                {selectedMovie.title}
              </h2>
              <p className="mt-2 text-sm text-content-subtle">Choose a score from 1 to 10.</p>
            </div>

            <div className="mt-6 grid grid-cols-5 gap-2" role="group" aria-label={`Rating for ${selectedMovie.title}`}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => handleRate(rating)}
                  disabled={loading}
                  aria-label={`Rate ${selectedMovie.title} ${rating} out of 10`}
                  aria-pressed={selectedMovie.personalRating === rating}
                  className={`kin-focus flex h-11 items-center justify-center rounded-full border text-sm font-bold transition disabled:opacity-50 ${
                    selectedMovie.personalRating === rating
                      ? "border-highlight bg-highlight text-black"
                      : "border-rule bg-surface text-content hover:border-highlight/50 hover:text-highlight"
                  }`}
                >
                  {rating}
                </button>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-center gap-2 text-xs text-content-subtle">
              {loading ? <Loader2 className="h-4 w-4 animate-spin text-highlight" /> : <Star className="h-4 w-4 text-highlight" />}
              {loading ? "Saving rating..." : "Ratings are shown out of five stars."}
            </div>

            {error && (
              <p role="alert" className="mt-4 rounded-sheet border border-accent/20 bg-accent-hover/10 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            )}
          </>
        )}
      </AccessibleDialog>
    </>
  );
}

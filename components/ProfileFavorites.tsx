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
      const res = await fetch("/api/user/favorites/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movieId: selectedMovie.id,
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
      <div className="flex flex-col items-center justify-center gap-4 rounded-sm border-y border-dashed border-white/10 bg-white/[0.02] px-6 py-10 text-center text-neutral-500">
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
            safeImage
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
              className="kin-focus absolute right-4 top-4 rounded-full border border-white/10 bg-white/5 p-2 text-neutral-400 transition hover:text-white disabled:opacity-50"
              aria-label="Close rating dialog"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="pr-10 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Your rating</p>
              <h2 id="rate-title-dialog" className="mt-1 font-display text-2xl font-bold text-white">
                {selectedMovie.title}
              </h2>
              <p className="mt-2 text-sm text-neutral-500">Choose a score from 1 to 10.</p>
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
                      ? "border-yellow-400 bg-yellow-400 text-black"
                      : "border-white/10 bg-white/5 text-neutral-300 hover:border-yellow-500/50 hover:text-yellow-300"
                  }`}
                >
                  {rating}
                </button>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-center gap-2 text-xs text-neutral-500">
              {loading ? <Loader2 className="h-4 w-4 animate-spin text-yellow-400" /> : <Star className="h-4 w-4 text-yellow-400" />}
              {loading ? "Saving rating..." : "Ratings are shown out of five stars."}
            </div>

            {error && (
              <p role="alert" className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            )}
          </>
        )}
      </AccessibleDialog>
    </>
  );
}

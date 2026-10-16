"use client";

import { movieRefPayload } from "@/lib/mediaDetail";
import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Film, Loader2, X } from "lucide-react";
import MovieCard, { type MovieProp } from "@/components/MovieCard";
import AccessibleDialog from "@/components/AccessibleDialog";
import StarRating from "@/components/StarRating";
import { useToast } from "@/components/ToastProvider";
import { mediaKey, normalizeMediaType } from "@/lib/media";
import type { FavoriteMovie } from "@/types";

export default function ProfileFavorites({ initialFavorites }: { initialFavorites: FavoriteMovie[] }) {
  const [selectedMovie, setSelectedMovie] = useState<MovieProp | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Stars, not the stored score. This control used to be ten buttons labelled 1-10 against a
  // "Choose a score from 1 to 10" prompt, while the movie page rated on 0.5-5 stars. Seeded
  // at 2.5 like MovieRatingControl so opening an unrated title starts in the middle rather
  // than on the minimum.
  const [draftStars, setDraftStars] = useState(2.5);
  // An unrated title seeds at 2.5, which maps to a real score (5 of 10). Without this, Save was
  // live on a freshly opened dialog and one click wrote a rating the member never picked.
  const [touched, setTouched] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  const closeDialog = useCallback(() => {
    if (!loading) {
      setSelectedMovie(null);
      setError("");
    }
  }, [loading]);

  const openDialog = useCallback((movie: MovieProp) => {
    setSelectedMovie(movie);
    setDraftStars(movie.personalRating ? movie.personalRating / 2 : 2.5);
    setTouched(false);
    setError("");
  }, []);

  const handleRate = async (stars: number) => {
    if (!selectedMovie) {
      return;
    }

    setLoading(true);
    setError("");

    // The wire format stays 1-10: the schema, starsLabel and the facet filter all read it.
    const rating = Math.round(stars * 2);

    try {
      const res = await fetch("/api/user/rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...movieRefPayload(selectedMovie), rating }),
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
      <div className="flex flex-col items-center justify-center gap-4 rounded-sm border-y border-dashed border-rule bg-glass px-6 py-10 text-center text-content-subtle">
        <Film className="h-12 w-12 opacity-30" aria-hidden="true" />
        <p>You have not added any favorites yet.</p>
        <Link href="/movies" className="kin-focus rounded-sm text-sm font-semibold text-accent-text transition">
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
            onRateClick={openDialog}
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
              <p className="text-xs font-bold uppercase tracking-overline text-highlight">Your rating</p>
              <h2 id="rate-title-dialog" className="mt-1 font-display text-2xl font-medium text-content">
                {selectedMovie.title}
              </h2>
                <p className="mt-2 text-sm text-content-subtle">
                  Drag or use the arrow keys to rate out of five stars.
                </p>
              </div>

              <div className="mt-6 flex flex-col items-center gap-3">
                <StarRating
                  value={draftStars}
                  onChange={(stars) => {
                    setDraftStars(stars);
                    setTouched(true);
                  }}
                  label={`Rate ${selectedMovie.title}`}
                  disabled={loading}
                  className="w-auto min-w-0"
                />
                <p className="text-sm font-medium text-content">{draftStars.toFixed(1)} stars</p>
                <button
                  type="button"
                  onClick={() => handleRate(draftStars)}
                  disabled={
                    loading || !touched || Math.round(draftStars * 2) === selectedMovie.personalRating
                  }
                  className="kin-focus rounded-full border border-rule bg-glass-strong px-5 py-2 text-sm font-semibold text-content transition hover:bg-glass-strong disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save
                </button>
              </div>


            {/* A status line, rendered only while a save is in flight. It used to render
                unconditionally and state "Ratings are shown out of five stars" -- which
                contradicted the 1-10 buttons above it, the "1 to 10" prompt, and their own
                aria-labels. The scale belongs with the prompt, so this now says only what
                is happening right now. */}
            {loading && (
              <div className="mt-5 flex items-center justify-center gap-2 text-xs text-content-subtle">
                <Loader2 className="h-4 w-4 animate-spin text-highlight" aria-hidden="true" />
                Saving rating...
              </div>
            )}

            {error && (
              <p role="alert" className="mt-4 rounded-sheet border border-accent/20 bg-accent-hover/10 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}
          </>
        )}
      </AccessibleDialog>
    </>
  );
}

"use client";

import { Bookmark, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "./ToastProvider";

type WatchlistButtonProps = {
  movie: {
    id: string;
    title: string;
    poster_path: string | null;
    vote_average: number;
    release_date?: string;
  };
  initialIsWatchlisted: boolean;
};

export default function WatchlistButton({ movie, initialIsWatchlisted }: WatchlistButtonProps) {
  const [isWatchlisted, setIsWatchlisted] = useState(initialIsWatchlisted);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  const toggleWatchlist = async () => {
    setLoading(true);

    try {
      const res = await fetch("/api/user/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movieId: movie.id,
          title: movie.title,
          posterPath: movie.poster_path,
          voteAverage: movie.vote_average,
          releaseDate: movie.release_date,
        }),
      });

      if (res.status === 401) {
        showToast("Sign in to use your watchlist.", "info");
        router.push("/login");
        return;
      }

      if (!res.ok) {
        showToast("Could not update watchlist.", "error");
        return;
      }

      const data = await res.json();
      setIsWatchlisted(data.isWatchlisted);
      showToast(data.isWatchlisted ? "Added to watchlist." : "Removed from watchlist.", "success");
      router.refresh();
    } catch {
      showToast("Could not update watchlist.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggleWatchlist}
      disabled={loading}
      className={`kin-focus flex h-11 w-11 items-center justify-center rounded-full border transition-all group ${
        isWatchlisted
          ? "border-blue-500 bg-blue-600 text-white shadow-[0_14px_30px_-18px_rgba(59,130,246,0.9)]"
          : "border-white/10 bg-white/7 text-white hover:bg-white/12"
      }`}
      aria-label={isWatchlisted ? "Remove from watchlist" : "Add to watchlist"}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <Bookmark className={`h-5 w-5 transition-transform group-active:scale-75 ${isWatchlisted ? "fill-current" : ""}`} />
      )}
    </button>
  );
}

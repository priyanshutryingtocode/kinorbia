"use client";

import { useState } from "react";
import { Check, Eye, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "./ToastProvider";

type WatchedButtonProps = {
  movie: {
    id: string;
    title: string;
    poster_path: string | null;
    mediaType?: "movie" | "tv";
  };
  initialIsWatched: boolean;
};

export default function WatchedButton({ movie, initialIsWatched }: WatchedButtonProps) {
  const [isWatched, setIsWatched] = useState(initialIsWatched);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  const handleClick = async () => {
    if (isWatched) {
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/user/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movieId: movie.id,
          movieTitle: movie.title,
          posterPath: movie.poster_path,
          mediaType: movie.mediaType || "movie",
        }),
      });

      if (res.status === 401) {
        showToast("Sign in to mark movies as watched.", "info");
        router.push("/login");
        return;
      }

      if (res.ok) {
        setIsWatched(true);
        showToast("Marked as watched.", "success");
        router.refresh();
      } else {
        showToast("Could not mark this movie as watched.", "error");
      }
    } catch {
      showToast("Could not mark this movie as watched.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading || isWatched}
      className={`kin-focus flex h-11 w-11 items-center justify-center rounded-full border transition-all group ${
        isWatched
          ? "border-emerald-500 bg-emerald-600 text-white shadow-[0_14px_30px_-18px_rgba(16,185,129,0.8)]"
          : "border-white/10 bg-white/7 text-white hover:bg-white/12"
      }`}
      aria-label={isWatched ? "Movie marked as watched" : "Mark movie as watched"}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : isWatched ? (
        <Check className="h-5 w-5" />
      ) : (
        <Eye className="h-5 w-5 transition-transform group-active:scale-75" />
      )}
    </button>
  );
}

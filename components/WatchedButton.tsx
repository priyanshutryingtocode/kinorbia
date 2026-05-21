"use client";

import { useState } from "react";
import { Check, Eye, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

type WatchedButtonProps = {
  movie: {
    id: string;
    title: string;
    poster_path: string | null;
  };
  initialIsWatched: boolean;
};

export default function WatchedButton({ movie, initialIsWatched }: WatchedButtonProps) {
  const [isWatched, setIsWatched] = useState(initialIsWatched);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
        }),
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (res.ok) {
        setIsWatched(true);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading || isWatched}
      className={`p-3 rounded-full border transition-all flex items-center justify-center group ${
        isWatched
          ? "bg-emerald-600 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.35)]"
          : "bg-white/10 border-white/10 text-white hover:bg-white/20 hover:scale-105"
      }`}
      aria-label={isWatched ? "Movie marked as watched" : "Mark movie as watched"}
    >
      {loading ? (
        <Loader2 className="w-6 h-6 animate-spin" />
      ) : isWatched ? (
        <Check className="w-6 h-6" />
      ) : (
        <Eye className="w-6 h-6 transition-transform group-active:scale-75" />
      )}
    </button>
  );
}

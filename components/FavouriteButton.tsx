"use client";

import { useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "./ToastProvider";

interface FavButtonProps {
  movie: {
    id: string;
    title: string;
    poster_path: string | null;
    vote_average: number;
    release_date?: string;
    mediaType?: "movie" | "tv";
  };
  initialIsFavorite: boolean;
}

export default function FavoriteButton({ movie, initialIsFavorite }: FavButtonProps) {
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  const handleToggle = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movieId: movie.id,
          movieTitle: movie.title,
          posterPath: movie.poster_path,
          voteAverage: movie.vote_average,
          releaseDate: movie.release_date,
          mediaType: movie.mediaType || "movie",
        }),
      });

      if (res.status === 401) {
        showToast("Sign in to save favorites.", "info");
        router.push("/login"); 
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setIsFavorite(data.isFavorite); 
        showToast(data.isFavorite ? "Added to favorites." : "Removed from favorites.", "success");
        router.refresh(); 
      } else {
        showToast("Could not update favorites.", "error");
      }
    } catch {
      showToast("Could not update favorites.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`kin-focus flex h-11 w-11 items-center justify-center rounded-full border transition-all group ${
        isFavorite
          ? "border-red-500 bg-red-600 text-white shadow-[0_14px_30px_-18px_rgba(220,38,38,0.9)]"
          : "border-white/10 bg-white/7 text-white hover:bg-white/12"
      }`}
      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <Heart
          className={`h-5 w-5 transition-transform group-active:scale-75 ${
            isFavorite ? "fill-current" : ""
          }`}
        />
      )}
    </button>
  );
}

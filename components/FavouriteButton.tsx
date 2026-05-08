"use client";

import { useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface FavButtonProps {
  movie: {
    id: string;
    title: string;
    poster_path: string | null;
    vote_average: number;
    release_date?: string;
  };
  initialIsFavorite: boolean;
}

export default function FavoriteButton({ movie, initialIsFavorite }: FavButtonProps) {
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleToggle = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/favorites", {
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
        router.push("/login"); // Send to login if not authenticated
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setIsFavorite(data.isFavorite); // Update state based on server response
        router.refresh(); // Refresh so Profile page updates in background
      }
    } catch {
      console.error("Failed to toggle favorite");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`p-3 rounded-full border transition-all flex items-center justify-center group ${
        isFavorite
          ? "bg-red-600 border-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]"
          : "bg-white/10 border-white/10 text-white hover:bg-white/20 hover:scale-105"
      }`}
    >
      {loading ? (
        <Loader2 className="w-6 h-6 animate-spin" />
      ) : (
        <Heart
          className={`w-6 h-6 transition-transform group-active:scale-75 ${
            isFavorite ? "fill-current" : ""
          }`}
        />
      )}
    </button>
  );
}

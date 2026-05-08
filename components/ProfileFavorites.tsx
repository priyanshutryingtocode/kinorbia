"use client";

import { useState } from "react";
import MovieCard, { MovieProp } from "./MovieCard";
import { Film, X, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FavoriteMovie } from "@/types";

export default function ProfileFavorites({ initialFavorites }: { initialFavorites: FavoriteMovie[] }) {
  const [selectedMovie, setSelectedMovie] = useState<MovieProp | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRate = async (rating: number) => {
    if (!selectedMovie) return;
    setLoading(true);

    try {
      const res = await fetch("/api/user/favorites/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieId: selectedMovie.id, rating }),
      });

      if (res.ok) {
        setSelectedMovie(null); // Close modal
        router.refresh();       // Tell Next.js to re-fetch the server page
      }
    } catch {
      console.error("Failed to rate");
    } finally {
      setLoading(false);
    }
  };

  if (initialFavorites.length === 0) {
    return (
      <div className="h-64 rounded-2xl border border-dashed border-white/10 bg-white/5 flex flex-col items-center justify-center text-neutral-500 gap-4">
         <Film className="w-12 h-12 opacity-20" />
         <p>You have not added any favorites yet.</p>
         <Link href="/" className="text-red-500 hover:text-red-400 text-sm hover:underline">
           Browse Movies
         </Link>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {initialFavorites.map((fav) => (
          <MovieCard 
            key={fav.movieId} 
            movie={{
              id: fav.movieId,
              title: fav.title,
              poster_path: fav.posterPath,
              vote_average: fav.voteAverage,
              release_date: fav.releaseDate,
              personalRating: fav.personalRating || 0 
            }} 
            onRateClick={setSelectedMovie}
          />
        ))}
      </div>

      {selectedMovie && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !loading && setSelectedMovie(null)}></div>
          
          <div className="relative w-full max-w-sm bg-neutral-900 border border-white/10 rounded-2xl p-6 shadow-2xl text-center">
            <button 
              onClick={() => setSelectedMovie(null)} 
              className="absolute top-4 right-4 text-neutral-400 hover:text-white"
              disabled={loading}
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-white mb-2">Rate Movie</h3>
            <p className="text-sm text-neutral-400 mb-6">{selectedMovie.title}</p>

            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRate(star)}
                  disabled={loading}
                  className={`w-10 h-10 rounded-full border transition flex items-center justify-center ${
                    selectedMovie.personalRating === star 
                      ? "bg-yellow-500 border-yellow-400 text-black shadow-[0_0_15px_rgba(234,179,8,0.5)]" 
                      : "border-white/10 text-neutral-400 hover:border-yellow-500 hover:text-yellow-500 bg-white/5"
                  }`}
                >
                  <span className="text-sm font-bold">{star}</span>
                </button>
              ))}
            </div>

            {loading && <Loader2 className="w-6 h-6 animate-spin text-yellow-500 mx-auto" />}
          </div>
        </div>
      )}
    </>
  );
}

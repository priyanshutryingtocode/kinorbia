"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

// Standard TMDB Movie Genres and their exact IDs
const GENRES = [
  { id: "", name: "All Movies" }, // Empty string clears the filter
  { id: "28", name: "Action" },
  { id: "12", name: "Adventure" },
  { id: "16", name: "Animation" },
  { id: "35", name: "Comedy" },
  { id: "80", name: "Crime" },
  { id: "18", name: "Drama" },
  { id: "14", name: "Fantasy" },
  { id: "27", name: "Horror" },
  { id: "878", name: "Sci-Fi" },
  { id: "53", name: "Thriller" },
];

export default function GenreFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get the current genre ID from the URL (defaults to empty string if none)
  const currentGenre = searchParams.get("genre") || "";

  // Helper to update the URL without refreshing the page
  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }
      return params.toString();
    },
    [searchParams]
  );

  return (
    <div className="w-full flex overflow-x-auto gap-3 py-4 hide-scrollbar snap-x mb-8 border-b border-white/5">
      {GENRES.map((genre) => {
        const isActive = currentGenre === genre.id;
        
        return (
          <button
            key={genre.name}
            onClick={() => {
              const queryString = createQueryString("genre", genre.id);
              router.push(`?${queryString}`, { scroll: false }); 
            }}
            className={`snap-start shrink-0 px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 border ${
              isActive 
                ? "bg-red-600 border-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]" 
                : "bg-white/3 border-white/10 text-neutral-400 hover:text-white hover:bg-white/10 hover:border-white/20"
            }`}
          >
            {genre.name}
          </button>
        );
      })}
    </div>
  );
}
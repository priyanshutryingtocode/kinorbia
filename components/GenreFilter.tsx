"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import type { MediaType } from "@/types";

const FILTER_GENRES: Record<MediaType, { id: string; name: string }[]> = {
  movie: [
    { id: "", name: "All Movies" },
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
  ],
  tv: [
    { id: "", name: "All Shows" },
    { id: "10759", name: "Action & Adventure" },
    { id: "16", name: "Animation" },
    { id: "35", name: "Comedy" },
    { id: "80", name: "Crime" },
    { id: "99", name: "Documentary" },
    { id: "18", name: "Drama" },
    { id: "10751", name: "Family" },
    { id: "9648", name: "Mystery" },
    { id: "10765", name: "Sci-Fi & Fantasy" },
    { id: "10768", name: "War & Politics" },
  ],
};

const BASE_PATHS: Record<MediaType, string> = { movie: "/", tv: "/shows" };

export default function GenreFilter({ mediaType }: { mediaType: MediaType }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentGenre = searchParams.get("genre") || "";
  const genres = FILTER_GENRES[mediaType];

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
    <div className="mb-10">
      <div className="relative overflow-hidden rounded-lg border border-white/10 bg-neutral-950/55 p-1.5 shadow-[0_18px_55px_-42px_rgba(0,0,0,0.95)] backdrop-blur-xl">
        <div className="overflow-x-auto hide-scrollbar">
          <div className="grid w-max snap-x grid-flow-col auto-cols-max gap-1.5 lg:w-full lg:grid-flow-row lg:grid-cols-[repeat(11,minmax(max-content,1fr))]">
            {genres.map((genre) => {
              const isActive = currentGenre === genre.id;

              return (
                <button
                  key={genre.name}
                  onClick={() => {
                    const queryString = createQueryString("genre", genre.id);
                    router.push(queryString ? `${BASE_PATHS[mediaType]}?${queryString}` : BASE_PATHS[mediaType], { scroll: false });
                  }}
                  className={`kin-focus relative w-full snap-start whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-all duration-300 lg:px-2 ${
                    isActive
                      ? "bg-white text-neutral-950 shadow-[0_12px_28px_-18px_rgba(255,255,255,0.7)]"
                      : "text-neutral-400 hover:bg-white/7 hover:text-white"
                  }`}
                >
                  {genre.name}
                  {isActive && (
                    <span className="absolute inset-x-4 -bottom-1 h-px rounded-full bg-red-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

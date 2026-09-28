"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { MediaType } from "@/types";
import { CURATED_GENRES, curatedGenreName } from "@/lib/genres";

const BASE_PATHS: Record<MediaType, string> = { movie: "/", tv: "/shows" };

export default function GenreFilter({ mediaType }: { mediaType: MediaType }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentGenre = searchParams.get("genre") || "";
  // Names resolve through lib/genres, so they cannot drift from the ones the
  // insights chart uses. The empty id is the "everything" entry.
  const genres = [
    { id: "", name: mediaType === "tv" ? "All Shows" : "All Movies" },
    ...CURATED_GENRES[mediaType].map((id) => ({
      id: String(id),
      name: curatedGenreName(id, mediaType),
    })),
  ];

  const createQueryString = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }
    return params.toString();
  };

  return (
    <div className="mb-10">
      <div className="relative overflow-hidden rounded-sheet border border-rule bg-canvas/55 p-1.5 shadow-[0_18px_55px_-42px_rgba(0,0,0,0.95)] backdrop-blur-xl">
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
                  className={`kin-focus relative w-full snap-start whitespace-nowrap rounded-control px-4 py-2 text-sm font-medium transition-all duration-300 lg:px-2 ${
                    isActive
                      ? "bg-content text-canvas shadow-[0_12px_28px_-18px_rgba(255,255,255,0.7)]"
                      : "text-content-muted hover:bg-white/7 hover:text-content"
                  }`}
                >
                  {genre.name}
                  {isActive && (
                    <span className="absolute inset-x-4 -bottom-1 h-px rounded-full bg-accent-hover" />
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

import Link from "next/link";
import type { MediaType } from "@/types";
import { CURATED_GENRES, curatedGenreName } from "@/lib/genres";

const BASE_PATHS: Record<MediaType, string> = { movie: "/movies", tv: "/shows" };

// Server component, not a client one.
//
// This used to be `<button>`s driven by useRouter, which meant a genre had no URL of its
// own: nothing to share, middle-click or prefetch, and no link for a crawler to follow. It
// is a plain list of links now, and the active genre arrives as a prop from the page that
// already read it out of searchParams -- so the highlight stays correct without the bar
// having to read the URL itself.
export default function GenreFilter({
  mediaType,
  currentGenre = "",
}: {
  mediaType: MediaType;
  currentGenre?: string;
}) {
  const genres = [
    { id: "", name: mediaType === "tv" ? "All Shows" : "All Movies" },
    ...CURATED_GENRES[mediaType].map((id) => ({
      id: String(id),
      name: curatedGenreName(id, mediaType),
    })),
  ];

  // "All" drops the param entirely rather than setting genre="", so the unfiltered view has
  // one canonical URL instead of two that render the same thing.
  function genreHref(genreId: string) {
    return genreId ? `${BASE_PATHS[mediaType]}?genre=${genreId}` : BASE_PATHS[mediaType];
  }

  return (
    <div className="mb-10">
      <div className="relative overflow-hidden rounded-sheet border border-rule bg-canvas/55 p-1.5 shadow-filter backdrop-blur-xl">
        <div className="overflow-x-auto hide-scrollbar">
          <div className="grid w-max snap-x grid-flow-col auto-cols-max gap-1.5 lg:w-full lg:grid-flow-row lg:grid-cols-[repeat(11,minmax(max-content,1fr))]">
            {genres.map((genre) => {
              const isActive = currentGenre === genre.id;

              return (
                <Link
                  key={genre.name}
                  href={genreHref(genre.id)}
                  scroll={false}
                  className={`kin-focus relative w-full snap-start whitespace-nowrap rounded-control px-4 py-2 text-center text-sm font-medium transition-all duration-300 lg:px-2 ${
                    isActive
                      ? "bg-highlight-muted text-on-highlight shadow-glow"
                      : "text-content-muted hover:bg-glass-strong hover:text-content"
                  }`}
                >
                  {genre.name}
                  {isActive && (
                    <span className="absolute inset-x-4 -bottom-1 h-px rounded-full bg-accent-hover" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

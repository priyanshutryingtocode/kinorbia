"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import PosterImage from "@/components/PosterImage";
import { mediaHref, normalizeMediaType } from "@/lib/media";

export interface CarouselMovie {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
  mediaType?: "movie" | "tv";
}

// This had its own null branch returning a bare ImageIcon, which looked nothing
// like the placeholder on the thirteen other surfaces. It did not need one: the
// parent is `aspect-2/3 relative bg-surface-raised`, so the shared fallback's
// `h-full w-full` fills the same box `TmdbPosterImage fill` occupied.
function CarouselPoster({ movie }: { movie: CarouselMovie }) {
  return (
    <PosterImage
      path={movie.poster_path}
      width="w500"
      alt={movie.title}
      sizes="(max-width: 768px) 144px, 192px"
      className="object-cover transition duration-500 group-hover/card:scale-[1.025] group-hover/card:saturate-110"
    />
  );
}

export default function MovieCarousel({ movies }: { movies: CarouselMovie[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const { clientWidth } = scrollRef.current;
      const scrollAmount = direction === "left" ? -(clientWidth - 150) : clientWidth - 150;
      
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: reducedMotion ? "auto" : "smooth" });
    }
  };

  return (
    <div className="group isolate relative">
      <button
        type="button"
        onClick={() => scroll("left")}
        className="kin-focus absolute left-0 top-1/2 z-10 hidden h-11 w-11 -translate-x-4 -translate-y-1/2 items-center justify-center rounded-full border border-rule bg-black/70 text-on-scrim opacity-0 shadow-card backdrop-blur-md transition-all duration-300 hover:border-rule-strong hover:bg-surface-raised focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 md:flex"
        aria-label="Scroll left"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div 
        ref={scrollRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-6 hide-scrollbar scroll-smooth sm:gap-5"
      >
        {movies.map((movie) => (
<Link 
            key={`${normalizeMediaType(movie.mediaType)}-${movie.id}`} 
            href={mediaHref(movie.mediaType, movie.id)}
             className="kin-focus group/card relative w-32 shrink-0 snap-start overflow-hidden rounded-sheet border border-rule bg-canvas transition-all duration-300 hover:-translate-y-1 hover:border-rule-strong hover:shadow-card-hover sm:w-36 md:w-44"
            aria-label={movie.title}
          >
            <div className="aspect-2/3 relative bg-surface-raised flex items-center justify-center overflow-hidden">
              <CarouselPoster movie={movie} />
              <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover/card:bg-black/8" />
              <div className="absolute top-2 left-2 rounded-full border border-rule bg-black/55 px-2.5 py-1 text-xs font-medium text-on-scrim backdrop-blur-md">
                {movie.release_date ? movie.release_date.substring(0, 4) : "TBD"}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <button
        type="button"
        onClick={() => scroll("right")}
        className="kin-focus absolute right-0 top-1/2 z-10 hidden h-11 w-11 translate-x-4 -translate-y-1/2 items-center justify-center rounded-full border border-rule bg-black/70 text-on-scrim opacity-0 shadow-card backdrop-blur-md transition-all duration-300 hover:border-rule-strong hover:bg-surface-raised focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 md:flex"
        aria-label="Scroll right"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}

"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import PosterImage from "@/components/PosterImage";
import PosterBadges from "@/components/PosterBadges";
import { mediaHref, normalizeMediaType, yearOf } from "@/lib/media";

export interface CarouselMovie {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
  // The rating chip needs it. TMDB's recommendation results already carry
  // `vote_average` on every entry -- verified against /movie/1396/recommendations
  // and /tv/1399/recommendations -- so this costs no extra request; the cast in
  // SimilarMedia was simply dropping it on the way through.
  vote_average: number;
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
        className="kin-focus absolute left-0 top-1/2 z-10 hidden h-11 w-11 -translate-x-4 -translate-y-1/2 items-center justify-center rounded-full border border-rule bg-scrim/70 text-on-scrim opacity-0 shadow-card backdrop-blur-md transition-all duration-300 hover:border-rule-strong hover:bg-surface-raised focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 md:flex"
        aria-label="Scroll left"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div 
        ref={scrollRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-6 hide-scrollbar scroll-smooth sm:gap-5"
      >
        {movies.map((movie) => {
          // null rather than a fallback string, so PosterBadges omits the chip
          // instead of printing "N/A" on every undated title in the strip.
          const year = movie.release_date ? yearOf(movie.release_date) : null;

          return (
          <Link
            key={`${normalizeMediaType(movie.mediaType)}-${movie.id}`}
            href={mediaHref(movie.mediaType, movie.id)}
            className="kin-focus group/card relative w-32 shrink-0 snap-start overflow-hidden rounded-sheet border border-rule bg-canvas transition-all duration-300 hover:-translate-y-1 hover:border-rule-strong hover:shadow-card-hover sm:w-36 md:w-44"
            aria-label={`${movie.title} (${year ?? "year unknown"})`}
          >
            <div className="aspect-2/3 relative bg-surface-raised flex items-center justify-center overflow-hidden">
              <CarouselPoster movie={movie} />
              <div className="absolute inset-0 bg-scrim/0 transition-colors duration-300 group-hover/card:bg-scrim/8" />
              <PosterBadges year={year} rating={movie.vote_average} size="sm" />
            </div>
          </Link>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => scroll("right")}
        className="kin-focus absolute right-0 top-1/2 z-10 hidden h-11 w-11 translate-x-4 -translate-y-1/2 items-center justify-center rounded-full border border-rule bg-scrim/70 text-on-scrim opacity-0 shadow-card backdrop-blur-md transition-all duration-300 hover:border-rule-strong hover:bg-surface-raised focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 md:flex"
        aria-label="Scroll right"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}

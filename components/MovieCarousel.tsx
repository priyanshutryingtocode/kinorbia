"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";

export interface CarouselMovie {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
  mediaType?: "movie" | "tv";
}

export default function MovieCarousel({ movies }: { movies: CarouselMovie[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const { clientWidth } = scrollRef.current;
      const scrollAmount = direction === "left" ? -(clientWidth - 150) : clientWidth - 150;
      
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <div className="relative group">
      <button 
        onClick={() => scroll("left")}
        className="kin-focus absolute left-0 top-1/2 z-30 hidden -translate-x-4 -translate-y-1/2 rounded-full border border-white/10 bg-black/70 p-2.5 text-white opacity-0 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.9)] backdrop-blur-md transition-all duration-300 hover:border-white/20 hover:bg-white/10 group-hover:opacity-100 md:flex"
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
            key={`${movie.mediaType || "movie"}-${movie.id}`} 
            href={movie.mediaType === "tv" ? `/tv/${movie.id}` : `/movie/${movie.id}`}
            className="kin-focus group/card relative w-32 shrink-0 snap-start overflow-hidden rounded-lg border border-white/8 bg-neutral-950 transition-all duration-300 hover:-translate-y-1 hover:border-white/18 hover:shadow-[0_24px_60px_-42px_rgba(220,38,38,0.45)] sm:w-36 md:w-44"
            aria-label={movie.title}
          >
            <div className="aspect-2/3 relative bg-neutral-900 flex items-center justify-center overflow-hidden">
              {movie.poster_path ? (
                <Image
                  src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                  alt={movie.title}
                  fill
                  sizes="(max-width: 768px) 144px, 192px"
                  className="object-cover transition duration-500 group-hover/card:scale-[1.025] group-hover/card:saturate-110"
                />
              ) : (
                <ImageIcon className="w-10 h-10 text-neutral-700" />
              )}
              <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover/card:bg-black/8" />
              <div className="absolute top-2 left-2 rounded-full border border-white/10 bg-black/55 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-md">
                {movie.release_date ? movie.release_date.substring(0, 4) : "TBD"}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <button 
        onClick={() => scroll("right")}
        className="kin-focus absolute right-0 top-1/2 z-30 hidden translate-x-4 -translate-y-1/2 rounded-full border border-white/10 bg-black/70 p-2.5 text-white opacity-0 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.9)] backdrop-blur-md transition-all duration-300 hover:border-white/20 hover:bg-white/10 group-hover:opacity-100 md:flex"
        aria-label="Scroll right"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}

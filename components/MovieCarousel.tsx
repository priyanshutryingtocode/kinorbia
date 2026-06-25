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
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-30 bg-black/80 text-white p-3 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 hover:bg-red-600 hover:scale-110 hover:border-red-500 transition-all duration-300 disabled:opacity-0 shadow-[0_0_15px_rgba(0,0,0,0.5)] backdrop-blur-sm hidden md:flex"
        aria-label="Scroll left"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <div 
        ref={scrollRef}
        className="flex overflow-x-auto gap-5 pb-6 snap-x snap-mandatory hide-scrollbar scroll-smooth"
      >
        {movies.map((movie) => (
          <Link 
            key={movie.id} 
            href={`/movie/${movie.id}`}
            className="snap-start shrink-0 w-36 md:w-48 group/card relative rounded-xl overflow-hidden bg-white/3 border border-white/5 hover:border-red-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_20px_-10px_rgba(220,38,38,0.3)]"
          >
            <div className="aspect-2/3 relative bg-neutral-900 flex items-center justify-center overflow-hidden">
              {movie.poster_path ? (
                <Image
                  src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                  alt={movie.title}
                  fill
                  sizes="(max-width: 768px) 144px, 192px"
                  className="object-cover group-hover/card:scale-105 transition-transform duration-500"
                />
              ) : (
                <ImageIcon className="w-10 h-10 text-neutral-700" />
              )}
              
              <div className="absolute inset-0 bg-linear-to-t from-neutral-950 via-transparent to-transparent opacity-80 z-10 pointer-events-none"></div>
            </div>

            <div className="absolute bottom-0 left-0 w-full p-3 z-20">
              <h3 className="text-white text-sm font-medium line-clamp-1 group-hover/card:text-red-400 transition-colors">
                {movie.title}
              </h3>
              <p className="text-neutral-500 text-xs mt-0.5">
                {movie.release_date ? movie.release_date.substring(0, 4) : "TBD"}
              </p>
            </div>
          </Link>
        ))}
      </div>

      <button 
        onClick={() => scroll("right")}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-30 bg-black/80 text-white p-3 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 hover:bg-red-600 hover:scale-110 hover:border-red-500 transition-all duration-300 shadow-[0_0_15px_rgba(0,0,0,0.5)] backdrop-blur-sm hidden md:flex"
        aria-label="Scroll right"
      >
        <ChevronRight className="w-6 h-6" />
      </button>
    </div>
  );
}
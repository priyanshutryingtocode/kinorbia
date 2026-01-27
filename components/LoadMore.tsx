"use client";

import { useEffect, useState } from "react";
import { useInView } from "react-intersection-observer";
import { fetchMovies } from "@/app/actions"; // Import the server action
import MovieCard, { MovieProp } from "./MovieCard";
import { Loader2 } from "lucide-react";

export default function LoadMore() {
  const [movies, setMovies] = useState<MovieProp[]>([]);
  const [page, setPage] = useState(2); // Start from page 2 (Page 1 is loaded by server)
  
  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView) {
      // Fetch the next page when the spinner comes into view
      fetchMovies(page).then((res) => {
        setMovies([...movies, ...res]);
        setPage(page + 1);
      });
    }
  }, [inView, page, movies]);

  return (
    <>
      {/* Render the new movies */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 mt-6">
        {movies.map((movie: MovieProp, index: number) => (
          <MovieCard key={`${movie.id}-${index}`} movie={movie} index={index} />
        ))}
      </div>

      {/* The "Invisible" Trigger Div */}
      <div ref={ref} className="flex justify-center items-center py-10 w-full">
        <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
      </div>
    </>
  );
}
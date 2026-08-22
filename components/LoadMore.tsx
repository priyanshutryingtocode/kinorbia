"use client";

import { useState } from "react";
import { useInView } from "react-intersection-observer";
import { fetchMovies, fetchTvShows } from "@/app/actions";
import MovieCard, { MovieProp } from "./MovieCard";
import { Loader2 } from "lucide-react";

interface LoadMoreProps {
  genre?: string;
  mediaType?: "movie" | "tv";
}

export default function LoadMore({ genre, mediaType = "movie" }: LoadMoreProps) {
  const [movies, setMovies] = useState<MovieProp[]>([]);
  const [page, setPage] = useState(2);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const fetcher = mediaType === "tv" ? fetchTvShows : fetchMovies;

  // By using onChange, we completely bypass the need for a useEffect
  const { ref } = useInView({
    onChange: (inView) => {
      if (inView && !loading && hasMore) {
        setLoading(true);

        fetcher(page, genre)
          .then((res) => {
            if (res.length > 0) {
              setMovies((prevMovies) => [...prevMovies, ...res]);
              setPage((prevPage) => prevPage + 1);
            } else {
              setHasMore(false);
            }
          })
          .catch((error) => {
            console.error("Failed to load more items:", error);
          })
          .finally(() => {
            setLoading(false);
          });
      }
    },
  });

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 mt-6">
        {movies.map((movie: MovieProp, index: number) => (
          <MovieCard key={`${movie.id}-${index}`} movie={movie} />
        ))}
      </div>

      <div ref={ref} className="flex justify-center items-center py-10 w-full min-h-25">
        {loading && <Loader2 className="w-8 h-8 text-red-600 animate-spin" />}
      </div>
    </>
  );
}
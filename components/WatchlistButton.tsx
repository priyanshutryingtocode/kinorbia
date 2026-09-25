"use client";

import { Bookmark } from "lucide-react";
import { MediaToggleButton, useMediaToggle } from "@/components/MediaToggle";
import { normalizeMediaType } from "@/lib/media";

const MESSAGES = {
  signIn: "Sign in to use your watchlist.",
  error: "Could not update watchlist.",
  added: "Added to watchlist.",
  removed: "Removed from watchlist.",
};

type WatchlistButtonProps = {
  movie: {
    id: string;
    title: string;
    poster_path: string | null;
    vote_average: number;
    release_date?: string;
    mediaType?: "movie" | "tv";
  };
  initialIsWatchlisted: boolean;
};

export default function WatchlistButton({ movie, initialIsWatchlisted }: WatchlistButtonProps) {
  const { active, loading, toggle } = useMediaToggle({
    endpoint: "/api/user/watchlist",
    payload: {
      movieId: movie.id,
      movieTitle: movie.title,
      posterPath: movie.poster_path,
      voteAverage: movie.vote_average,
      releaseDate: movie.release_date,
      mediaType: normalizeMediaType(movie.mediaType),
    },
    messages: MESSAGES,
    initialActive: initialIsWatchlisted,
    readActive: (data) => Boolean((data as { isWatchlisted?: boolean })?.isWatchlisted),
  });

  return (
    <MediaToggleButton
      active={active}
      loading={loading}
      disabled={loading}
      activeClassName="border-blue-500 bg-blue-600 text-white shadow-[0_14px_30px_-18px_rgba(59,130,246,0.9)]"
      icon={Bookmark}
      label={active ? "Remove from watchlist" : "Add to watchlist"}
      onClick={toggle}
    />
  );
}

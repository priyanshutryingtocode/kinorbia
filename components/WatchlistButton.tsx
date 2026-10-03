"use client";

import { Bookmark } from "lucide-react";
import type { DetailSummary } from "@/lib/mediaDetail";
import { MediaToggleButton, useMediaToggle } from "@/components/MediaToggle";
import { normalizeMediaType } from "@/lib/media";

const MESSAGES = {
  signIn: "Sign in to use your watchlist.",
  error: "Could not update watchlist.",
  added: "Added to watchlist.",
  removed: "Removed from watchlist.",
};

type WatchlistButtonProps = {
  movie: DetailSummary;
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
      activeClassName="border-transparent bg-info-solid text-on-accent shadow-float"
      icon={Bookmark}
      label={active ? "Remove from watchlist" : "Add to watchlist"}
      onClick={toggle}
    />
  );
}

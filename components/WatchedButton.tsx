"use client";

import { Check, Eye } from "lucide-react";
import { MediaToggleButton, useMediaToggle } from "@/components/MediaToggle";
import { normalizeMediaType } from "@/lib/media";

const MESSAGES = {
  signIn: "Sign in to mark movies as watched.",
  error: "Could not mark this movie as watched.",
  added: "Marked as watched.",
};

type WatchedButtonProps = {
  movie: {
    id: string;
    title: string;
    poster_path: string | null;
    mediaType?: "movie" | "tv";
  };
  initialIsWatched: boolean;
};

export default function WatchedButton({ movie, initialIsWatched }: WatchedButtonProps) {
  const { active, loading, locked, toggle } = useMediaToggle({
    endpoint: "/api/user/journal",
    payload: {
      movieId: movie.id,
      movieTitle: movie.title,
      posterPath: movie.poster_path,
      mediaType: normalizeMediaType(movie.mediaType),
    },
    messages: MESSAGES,
    initialActive: initialIsWatched,
    lockWhenActive: true,
  });

  return (
    <MediaToggleButton
      active={active}
      loading={loading}
      disabled={loading || locked}
      activeClassName="border-emerald-500 bg-emerald-600 text-white shadow-[0_14px_30px_-18px_rgba(16,185,129,0.8)]"
      icon={Eye}
      activeIcon={Check}
      activeIconClassName="h-5 w-5"
      label={active ? "Movie marked as watched" : "Mark movie as watched"}
      onClick={toggle}
    />
  );
}

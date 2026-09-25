"use client";

import { Heart } from "lucide-react";
import { MediaToggleButton, useMediaToggle } from "@/components/MediaToggle";
import { normalizeMediaType } from "@/lib/media";

const MESSAGES = {
  signIn: "Sign in to save favorites.",
  error: "Could not update favorites.",
  added: "Added to favorites.",
  removed: "Removed from favorites.",
};

type MovieRef = {
  id: string;
  title: string;
  poster_path: string | null;
  vote_average: number;
  release_date?: string;
  mediaType?: "movie" | "tv";
  genre_ids?: number[];
};

interface FavButtonProps {
  movie: MovieRef;
  initialIsFavorite: boolean;
}

export default function FavoriteButton({ movie, initialIsFavorite }: FavButtonProps) {
  const { active, loading, toggle } = useMediaToggle({
    endpoint: "/api/user/favorites",
    payload: {
      movieId: movie.id,
      movieTitle: movie.title,
      posterPath: movie.poster_path,
      voteAverage: movie.vote_average,
      releaseDate: movie.release_date,
      mediaType: normalizeMediaType(movie.mediaType),
      genreIds: movie.genre_ids || [],
    },
    messages: MESSAGES,
    initialActive: initialIsFavorite,
    readActive: (data) => Boolean((data as { isFavorite?: boolean })?.isFavorite),
  });

  return (
    <MediaToggleButton
      active={active}
      loading={loading}
      disabled={loading}
      activeClassName="border-red-500 bg-red-600 text-white shadow-[0_14px_30px_-18px_rgba(220,38,38,0.9)]"
      icon={Heart}
      label={active ? "Remove from favorites" : "Add to favorites"}
      onClick={toggle}
    />
  );
}

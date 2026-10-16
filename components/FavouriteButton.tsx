"use client";

import { movieRefPayload } from "@/lib/mediaDetail";
import { Heart } from "lucide-react";
import type { DetailSummary } from "@/lib/mediaDetail";
import { MediaToggleButton, useMediaToggle } from "@/components/MediaToggle";

const MESSAGES = {
  signIn: "Sign in to save favorites.",
  error: "Could not update favorites.",
  added: "Added to favorites.",
  removed: "Removed from favorites.",
};

interface FavButtonProps {
  movie: DetailSummary;
  initialIsFavorite: boolean;
}

export default function FavoriteButton({ movie, initialIsFavorite }: FavButtonProps) {
  const { active, loading, toggle } = useMediaToggle({
    endpoint: "/api/user/favorites",
    payload: movieRefPayload(movie),
    messages: MESSAGES,
    initialActive: initialIsFavorite,
    readActive: (data) => Boolean((data as { isFavorite?: boolean })?.isFavorite),
  });

  return (
    <MediaToggleButton
      active={active}
      loading={loading}
      disabled={loading}
      activeClassName="border-accent bg-accent text-on-accent shadow-float"
      icon={Heart}
      label={active ? "Remove from favorites" : "Add to favorites"}
      onClick={toggle}
    />
  );
}

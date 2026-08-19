"use client";

import { useEffect, useState } from "react";
import { Eye, Heart, ListPlus, Loader2, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "./ToastProvider";
import type { MovieSummary } from "@/types";

type UserList = {
  id: string;
  title: string;
};

export default function AssistantMovieActions({ movie }: { movie: MovieSummary }) {
  const [lists, setLists] = useState<UserList[]>([]);
  const [selectedList, setSelectedList] = useState("");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [rating, setRating] = useState("");
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    let active = true;

    fetch("/api/user/lists")
      .then(async (res) => {
        if (!res.ok) {
          return;
        }

        const data = await res.json();
        if (active) {
          setLists(data.lists || []);
        }
      })
      .catch(() => {
      });

    return () => {
      active = false;
    };
  }, []);

  const requireLogin = (status: number) => {
    if (status === 401) {
      showToast("Sign in to use this action.", "info");
      router.push("/login");
      return true;
    }

    return false;
  };

  const favoriteMovie = async () => {
    setLoadingAction("favorite");

    try {
      const res = await fetch("/api/user/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movieId: movie.id.toString(),
          movieTitle: movie.title,
          posterPath: movie.poster_path,
          voteAverage: movie.vote_average,
          releaseDate: movie.release_date,
          mediaType: movie.mediaType || "movie",
          genreIds: movie.genre_ids || [],
        }),
      });

      if (requireLogin(res.status)) return;

      if (res.ok) {
        const data = await res.json();
        showToast(data.isFavorite ? "Added to favorites." : "Removed from favorites.", "success");
        router.refresh();
      } else {
        showToast("Could not update favorites.", "error");
      }
    } catch {
      showToast("Could not update favorites.", "error");
    } finally {
      setLoadingAction(null);
    }
  };

  const markWatched = async () => {
    setLoadingAction("watched");

    try {
      const res = await fetch("/api/user/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movieId: movie.id.toString(),
          movieTitle: movie.title,
          posterPath: movie.poster_path,
          mediaType: movie.mediaType || "movie",
        }),
      });

      if (requireLogin(res.status)) return;

      if (res.ok) {
        showToast("Marked as watched.", "success");
        router.refresh();
      } else {
        showToast("Could not mark watched.", "error");
      }
    } catch {
      showToast("Could not mark watched.", "error");
    } finally {
      setLoadingAction(null);
    }
  };

  const rateMovie = async () => {
    if (!rating) {
      showToast("Pick a rating first.", "info");
      return;
    }

    setLoadingAction("rating");

    try {
      const res = await fetch("/api/user/rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movieId: movie.id.toString(),
          movieTitle: movie.title,
          posterPath: movie.poster_path,
          voteAverage: movie.vote_average,
          releaseDate: movie.release_date,
          rating,
          mediaType: movie.mediaType || "movie",
          genreIds: movie.genre_ids || [],
        }),
      });

      if (requireLogin(res.status)) return;

      if (res.ok) {
        showToast(`Rated ${rating}/10.`, "success");
        router.refresh();
      } else {
        showToast("Could not save rating.", "error");
      }
    } catch {
      showToast("Could not save rating.", "error");
    } finally {
      setLoadingAction(null);
    }
  };

  const addToList = async () => {
    if (!selectedList) {
      showToast("Pick a list first.", "info");
      return;
    }

    setLoadingAction("list");

    try {
      const res = await fetch("/api/user/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listId: selectedList,
          movie: {
            movieId: movie.id.toString(),
            movieTitle: movie.title,
            posterPath: movie.poster_path,
            voteAverage: movie.vote_average,
            releaseDate: movie.release_date,
            mediaType: movie.mediaType || "movie",
          },
        }),
      });

      if (requireLogin(res.status)) return;

      if (res.ok) {
        showToast("Added to list.", "success");
        router.refresh();
      } else if (res.status === 409) {
        showToast("That movie is already in this list.", "info");
      } else {
        showToast("Could not add to list.", "error");
      }
    } catch {
      showToast("Could not add to list.", "error");
    } finally {
      setLoadingAction(null);
    }
  };

  const isLoading = Boolean(loadingAction);

  return (
    <div className="mt-2 space-y-2 border-t border-white/10 pt-2">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={favoriteMovie}
          disabled={isLoading}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-white/5 px-2 py-2 text-xs text-neutral-200 transition hover:bg-white/10 disabled:opacity-60"
        >
          {loadingAction === "favorite" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Heart className="h-3.5 w-3.5" />}
          Favorite
        </button>
        <button
          type="button"
          onClick={markWatched}
          disabled={isLoading}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-white/5 px-2 py-2 text-xs text-neutral-200 transition hover:bg-white/10 disabled:opacity-60"
        >
          {loadingAction === "watched" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
          Watched
        </button>
      </div>

      <div className="flex gap-2">
        <select
          value={rating}
          onChange={(event) => setRating(event.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/25 px-2 py-2 text-xs text-white focus:border-yellow-500 focus:outline-none"
        >
          <option value="">Rate</option>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
            <option key={value} value={value}>{value}/10</option>
          ))}
        </select>
        <button
          type="button"
          onClick={rateMovie}
          disabled={isLoading}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-yellow-500/10 px-2 py-2 text-xs text-yellow-300 transition hover:bg-yellow-500/20 disabled:opacity-60"
        >
          {loadingAction === "rating" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Star className="h-3.5 w-3.5" />}
          Save
        </button>
      </div>

      {lists.length > 0 && (
        <div className="flex gap-2">
          <select
            value={selectedList}
            onChange={(event) => setSelectedList(event.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/25 px-2 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
          >
            <option value="">Add to list</option>
            {lists.map((list) => (
              <option key={list.id} value={list.id}>{list.title}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={addToList}
            disabled={isLoading}
            className="flex items-center justify-center rounded-lg bg-red-500/15 px-2 py-2 text-red-300 transition hover:bg-red-500/25 disabled:opacity-60"
            aria-label="Add to selected list"
          >
            {loadingAction === "list" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ListPlus className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}
    </div>
  );
}

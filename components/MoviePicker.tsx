"use client";

import { useId, useMemo, useState } from "react";
import { MAX_LIST_MOVIES } from "@/lib/bounds";
import { mediaKey } from "@/lib/media";
import type { FavoriteMovie } from "@/types";

const PAGE_SIZE = 50;

export type MoviePickerProps = {
  name: string;
  favorites: FavoriteMovie[];
  defaultSelected?: string[];
  max?: number;
  label?: string;
  emptyMessage?: string;
};

export default function MoviePicker({
  name,
  favorites,
  defaultSelected = [],
  max = MAX_LIST_MOVIES,
  label = "Select movies",
  emptyMessage = "No favorites available.",
}: MoviePickerProps) {
  const pickerId = useId();
  const searchId = `${pickerId}-search`;
  const statusId = `${pickerId}-status`;
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(defaultSelected.filter(Boolean))
  );
  const [limitMessage, setLimitMessage] = useState("");

  const movies = useMemo(() => {
    const uniqueMovies = new Map<string, FavoriteMovie>();
    favorites.forEach((movie) => {
      const key = mediaKey(movie.mediaType, movie.movieId);
      if (!uniqueMovies.has(key)) {
        uniqueMovies.set(key, movie);
      }
    });
    return Array.from(uniqueMovies.values());
  }, [favorites]);

  const query = search.trim().toLocaleLowerCase();
  const results = useMemo(() => {
    if (!query) {
      return movies;
    }

    return movies.filter((movie) => {
      const type = movie.mediaType === "tv" ? "series" : "movie";
      const year = movie.releaseDate?.slice(0, 4) ?? "";
      return `${movie.title} ${year} ${type}`.toLocaleLowerCase().includes(query);
    });
  }, [movies, query]);

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const visibleMovies = results.slice(pageStart, pageStart + PAGE_SIZE);
  const selectionLimit = Number.isFinite(max) ? Math.max(0, Math.floor(max)) : MAX_LIST_MOVIES;
  const atLimit = selected.size >= selectionLimit;
  const notice =
    selected.size > selectionLimit
      ? `${selected.size} titles are selected. The limit is ${selectionLimit}; remove ${selected.size - selectionLimit} before saving.`
      : limitMessage || (atLimit ? `Maximum of ${selectionLimit} titles selected.` : "");

  const toggleMovie = (value: string) => {
    const next = new Set(selected);
    if (next.has(value)) {
      next.delete(value);
      setSelected(next);
      setLimitMessage("");
      return;
    }
    if (next.size >= selectionLimit) {
      setLimitMessage(`Select no more than ${selectionLimit} titles.`);
      return;
    }
    next.add(value);
    setSelected(next);
    setLimitMessage("");
  };

  return (
    <fieldset className="min-w-0">
      <legend className="kin-label">{label}</legend>
      <div className="sr-only" aria-hidden="true">
        {Array.from(selected).map((value) => (
          <input key={value} type="hidden" name={name} value={value} />
        ))}
      </div>
      <p
        id={statusId}
        role={limitMessage ? "alert" : "status"}
        aria-live={limitMessage ? "assertive" : "polite"}
        className={`mt-1.5 text-xs ${notice ? "text-highlight" : "text-content-subtle"}`}
      >
        {selected.size} of {selectionLimit} selected.
        {notice ? ` ${notice}` : ""}
      </p>
      {movies.length > 0 && (
        <div className="kin-field mt-3">
          <label htmlFor={searchId} className="kin-label">
            Search favorites
          </label>
          <input
            id={searchId}
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search by title, year, or media type"
            className="kin-input"
          />
        </div>
      )}
      {visibleMovies.length > 0 ? (
        <>
          <div className="mt-3 max-h-80 overflow-y-auto rounded-control border border-rule bg-canvas/35">
            {visibleMovies.map((movie) => {
              const value = mediaKey(movie.mediaType, movie.movieId);
              const isSelected = selected.has(value);
              const checkboxId = `${pickerId}-${value}`;
              const mediaLabel = movie.mediaType === "tv" ? "Series" : "Movie";
              const year = movie.releaseDate?.slice(0, 4) || "Year unknown";

              return (
                <label
                  key={value}
                  htmlFor={checkboxId}
                  className="flex cursor-pointer items-center gap-3 border-b border-rule px-3 py-2.5 last:border-b-0 hover:bg-surface-raised"
                >
                  <input
                    id={checkboxId}
                    type="checkbox"
                    value={value}
                    checked={isSelected}
                    disabled={atLimit && !isSelected}
                    onChange={() => toggleMovie(value)}
                    aria-describedby={statusId}
                    className="h-4 w-4 shrink-0 accent-accent"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-content">{movie.title}</span>
                    <span className="mt-0.5 block text-xs text-content-subtle">
                      {mediaLabel} · {year}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          <div className="mt-2 flex min-h-8 items-center justify-between gap-3 text-xs text-content-subtle">
            <span aria-live="polite" aria-atomic="true">
              Showing {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, results.length)} of {results.length}
            </span>
            {totalPages > 1 && (
              <nav aria-label={`${label} pagination`} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="kin-focus rounded-control border border-rule px-2.5 py-1.5 transition-colors hover:border-rule-strong hover:text-content disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="px-1 tabular-nums">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="kin-focus rounded-control border border-rule px-2.5 py-1.5 transition-colors hover:border-rule-strong hover:text-content disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </nav>
            )}
          </div>
        </>
      ) : (
        <p className="mt-3 rounded-control border border-rule bg-surface-raised px-3 py-3 text-sm text-content-muted">
          {query ? `No favorites match “${search.trim()}”.` : emptyMessage}
        </p>
      )}
    </fieldset>
  );
}

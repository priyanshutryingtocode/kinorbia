import Link from "next/link";
import Image from "next/image";
import { Film, Search } from "lucide-react";
import type { Metadata } from "next";
import SearchHistory from "@/components/SearchHistory";
import SearchTrackerForm from "@/components/SearchTrackerForm";
import EmptyState from "@/components/EmptyState";
import {
  searchMovies as searchTmdbMovies,
  discoverMovies,
  searchTv as searchTmdbTv,
  discoverTv,
} from "@/lib/tmdb";
import type { MovieSummary } from "@/types";
import { normalizeMediaType } from "@/lib/media";

type SearchResponse = {
  results?: MovieSummary[];
};

async function searchContent({
  query,
  year,
  genre,
  minRating,
  maxRuntime,
  language,
  sort,
  type,
}: {
  query: string;
  year: string;
  genre: string;
  minRating: number;
  maxRuntime: string;
  language: string;
  sort: string;
  type: "movie" | "tv";
}): Promise<SearchResponse> {
  const isTv = type === "tv";
  const yearKey = isTv ? "first_air_date_year" : "primary_release_year";
  const yearParam = year ? `&${yearKey}=${encodeURIComponent(year)}` : "";
  const ratingParam = minRating ? `&vote_average.gte=${encodeURIComponent(minRating)}` : "";
  const genreParam = genre ? `&with_genres=${encodeURIComponent(genre)}` : "";
  const runtimeParam = !isTv && maxRuntime ? `&with_runtime.lte=${encodeURIComponent(maxRuntime)}` : "";
  const languageParam = language ? `&with_original_language=${encodeURIComponent(language)}` : "";
  const sortParam = sort ? `&sort_by=${encodeURIComponent(sort)}` : "&sort_by=popularity.desc";

  if (!query && !year && !genre && !minRating && !maxRuntime && !language) {
    return { results: [] };
  }

  if (query) {
    const data = isTv ? await searchTmdbTv(query, yearParam) : await searchTmdbMovies(query, yearParam);
    return { results: data?.results || [] };
  }

  const data = isTv
    ? await discoverTv(yearParam + ratingParam + genreParam + languageParam + sortParam)
    : await discoverMovies(yearParam + ratingParam + genreParam + runtimeParam + languageParam + sortParam);
  return { results: data?.results || [] };
}

type SearchPageProps = {
  searchParams: Promise<{ q?: string; year?: string; minRating?: string; genre?: string; runtime?: string; language?: string; sort?: string; type?: string }> | { q?: string; year?: string; minRating?: string; genre?: string; runtime?: string; language?: string; sort?: string; type?: string };
};

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const { q, type } = await Promise.resolve(searchParams);
  const query = typeof q === "string" ? q.trim() : "";
  const mediaType = type === "tv" ? "Shows" : "Movies";

  return {
    title: query ? `Search results for "${query}"` : "Search KinOrbia",
    description: query
      ? `Search results for "${query}" across ${mediaType.toLowerCase()} on KinOrbia.`
      : "Find movies and shows by title, genre, rating, runtime, language, and year.",
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q, year, minRating, genre, runtime, language, sort, type } = await Promise.resolve(searchParams);
  const query = typeof q === "string" ? q.trim() : "";
  const releaseYear = typeof year === "string" ? year.trim() : "";
  const minimumRating = typeof minRating === "string" ? Number(minRating) : 0;
  const selectedGenre = typeof genre === "string" ? genre : "";
  const maxRuntime = typeof runtime === "string" ? runtime : "";
  const selectedLanguage = typeof language === "string" ? language : "";
  const selectedSort = typeof sort === "string" ? sort : "";
  const mediaType = type === "tv" ? "tv" : "movie";

  const buildTypeHref = (nextType: "movie" | "tv") => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (releaseYear) params.set("year", releaseYear);
    if (minRating) params.set("minRating", minRating);
    if (selectedGenre) params.set("genre", selectedGenre);
    if (maxRuntime) params.set("runtime", maxRuntime);
    if (selectedLanguage) params.set("language", selectedLanguage);
    if (selectedSort) params.set("sort", selectedSort);
    params.set("type", nextType);
    return `?${params.toString()}`;
  };

  const data = await searchContent({
    query,
    year: releaseYear,
    genre: selectedGenre,
    minRating: minimumRating,
    maxRuntime,
    language: selectedLanguage,
    sort: selectedSort,
    type: mediaType,
  });
  const movies = (data.results || []).filter((movie) => {
    const matchesRating = !minimumRating || movie.vote_average >= minimumRating;
    const matchesGenre = !query || !selectedGenre || movie.genre_ids?.includes(Number(selectedGenre));
    const matchesLanguage = !query || !selectedLanguage || movie.original_language === selectedLanguage;
    return matchesRating && matchesGenre && matchesLanguage;
  });

  return (
    <div className="min-h-screen bg-neutral-950 text-white px-6 py-12">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10">
          <p className="text-gold text-xs font-bold uppercase tracking-[0.18em] mb-3">
            Search
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-bold leading-[0.95]">Find a {mediaType === "tv" ? "Show" : "Movie"}</h1>
          <p className="text-neutral-400 mt-3 max-w-2xl">
            {mediaType === "tv"
              ? "Search by title or use filters to discover TV shows by genre, rating, language, and first air year."
              : "Search by title or use filters to discover movies by genre, rating, runtime, language, and release year."}
          </p>
        </header>

        <div className="mb-6 inline-flex items-center gap-1 rounded-full border border-white/10 bg-neutral-900/50 p-1">
          <Link
            href={buildTypeHref("movie")}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
              mediaType === "movie" ? "bg-red-600 text-white" : "text-neutral-400 hover:text-white"
            }`}
          >
            Movies
          </Link>
          <Link
            href={buildTypeHref("tv")}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
              mediaType === "tv" ? "bg-red-600 text-white" : "text-neutral-400 hover:text-white"
            }`}
          >
            Shows
          </Link>
        </div>

        <SearchHistory mediaType={mediaType} />

        <SearchTrackerForm mediaType={mediaType}>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Search..."
              className="w-full bg-neutral-950 border border-white/10 rounded-xl py-4 pl-12 pr-32 text-white placeholder:text-neutral-600 focus:outline-none focus:border-red-500/60 focus:ring-1 focus:ring-red-500/40"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-600 hover:bg-red-500 text-white text-sm font-bold px-5 py-2.5 rounded-lg transition"
            >
              Search
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
            <input
              name="year"
              type="number"
              min="1888"
              max="2100"
              defaultValue={releaseYear}
              placeholder={mediaType === "tv" ? "First air year" : "Release year"}
              className="bg-neutral-950 border border-white/10 rounded-lg px-3 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-red-500"
            />
            <select
              name="minRating"
              defaultValue={Number.isFinite(minimumRating) && minimumRating > 0 ? minimumRating.toString() : ""}
              className="bg-neutral-950 border border-white/10 rounded-lg px-3 py-3 text-sm text-white focus:outline-none focus:border-red-500"
            >
              <option value="">Any rating</option>
              <option value="5">5+ TMDB rating</option>
              <option value="6">6+ TMDB rating</option>
              <option value="7">7+ TMDB rating</option>
              <option value="8">8+ TMDB rating</option>
            </select>
            <select
              name="genre"
              defaultValue={selectedGenre}
              className="bg-neutral-950 border border-white/10 rounded-lg px-3 py-3 text-sm text-white focus:outline-none focus:border-red-500"
            >
              {mediaType === "tv" ? (
                <>
                  <option value="">Any genre</option>
                  <option value="10759">Action & Adventure</option>
                  <option value="16">Animation</option>
                  <option value="35">Comedy</option>
                  <option value="80">Crime</option>
                  <option value="99">Documentary</option>
                  <option value="18">Drama</option>
                  <option value="10751">Family</option>
                  <option value="9648">Mystery</option>
                  <option value="10765">Sci-Fi & Fantasy</option>
                  <option value="10768">War & Politics</option>
                </>
              ) : (
                <>
                  <option value="">Any genre</option>
                  <option value="28">Action</option>
                  <option value="35">Comedy</option>
                  <option value="18">Drama</option>
                  <option value="27">Horror</option>
                  <option value="878">Sci-Fi</option>
                  <option value="53">Thriller</option>
                </>
              )}
            </select>
            {mediaType === "movie" && (
              <select
                name="runtime"
                defaultValue={maxRuntime}
                className="bg-neutral-950 border border-white/10 rounded-lg px-3 py-3 text-sm text-white focus:outline-none focus:border-red-500"
              >
                <option value="">Any runtime</option>
                <option value="90">Under 90 min</option>
                <option value="120">Under 2 hours</option>
                <option value="150">Under 2.5 hours</option>
              </select>
            )}
            <select
              name="language"
              defaultValue={selectedLanguage}
              className="bg-neutral-950 border border-white/10 rounded-lg px-3 py-3 text-sm text-white focus:outline-none focus:border-red-500"
            >
              <option value="">Any language</option>
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="ja">Japanese</option>
              <option value="ko">Korean</option>
              <option value="fr">French</option>
            </select>
            <select
              name="sort"
              defaultValue={selectedSort}
              className="bg-neutral-950 border border-white/10 rounded-lg px-3 py-3 text-sm text-white focus:outline-none focus:border-red-500"
            >
              <option value="popularity.desc">Most popular</option>
              <option value="vote_average.desc">Highest rated</option>
              <option value={mediaType === "tv" ? "first_air_date.desc" : "primary_release_date.desc"}>Newest</option>
              {mediaType === "movie" && <option value="revenue.desc">Box office</option>}
            </select>
          </div>
        </SearchTrackerForm>

        {!query && !releaseYear && !selectedGenre && !minimumRating && !maxRuntime && !selectedLanguage ? (
          <EmptyState
            title="Start discovering"
            description={`Type a ${mediaType === "tv" ? "show" : "movie"} title or choose filters to begin.`}
          />
        ) : movies.length === 0 ? (
          <EmptyState
            title={`No ${mediaType === "tv" ? "shows" : "movies"} found`}
            description={
              query
                ? `We couldn't find any results for "${query}". Try a different title or adjust your filters.`
                : "Try adjusting your filters to find more results."
            }
          />
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-6">
              {query ? <>Results for <span className="text-red-500">{query}</span></> : "Discovery Results"}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {movies.map((movie) => (
                <Link
                  key={`${normalizeMediaType(movie.mediaType)}-${movie.id}`}
                  href={movie.mediaType === "tv" ? `/tv/${movie.id}` : `/movie/${movie.id}`}
                  className="group relative block bg-neutral-900/60 border border-white/10 rounded-xl overflow-hidden hover:border-red-500/40 transition"
                >
                  <div className="relative aspect-2/3 bg-neutral-800">
                    {movie.poster_path ? (
                      <Image
                        src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                        alt={movie.title}
                        fill
                        sizes="(min-width: 1024px) 20vw, (min-width: 768px) 25vw, 50vw"
                        className="object-cover group-hover:opacity-80 transition"
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <Film className="text-neutral-600" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium truncate group-hover:text-red-500 transition-colors">
                      {movie.title}
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">
                      {movie.release_date ? new Date(movie.release_date).getFullYear() : "N/A"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

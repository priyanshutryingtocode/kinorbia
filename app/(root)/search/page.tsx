import Link from "next/link";
import Image from "next/image";
import { Film, Search } from "lucide-react";
import SearchHistory from "@/components/SearchHistory";
import { searchMovies as searchTmdbMovies, discoverMovies } from "@/lib/tmdb";
import type { MovieSummary } from "@/types";

type SearchResponse = {
  results?: MovieSummary[];
};

async function searchMovies({
  query,
  year,
  genre,
  minRating,
  maxRuntime,
  language,
  sort,
}: {
  query: string;
  year: string;
  genre: string;
  minRating: number;
  maxRuntime: string;
  language: string;
  sort: string;
}): Promise<SearchResponse> {
  const yearParam = year ? `&primary_release_year=${encodeURIComponent(year)}` : "";
  const ratingParam = minRating ? `&vote_average.gte=${encodeURIComponent(minRating)}` : "";
  const genreParam = genre ? `&with_genres=${encodeURIComponent(genre)}` : "";
  const runtimeParam = maxRuntime ? `&with_runtime.lte=${encodeURIComponent(maxRuntime)}` : "";
  const languageParam = language ? `&with_original_language=${encodeURIComponent(language)}` : "";
  const sortParam = sort ? `&sort_by=${encodeURIComponent(sort)}` : "&sort_by=popularity.desc";

  if (!query && !year && !genre && !minRating && !maxRuntime && !language) {
    return { results: [] };
  }

  if (query) {
    const data = await searchTmdbMovies(query, yearParam);
    return { results: data?.results || [] };
  }

  const data = await discoverMovies(yearParam + ratingParam + genreParam + runtimeParam + languageParam + sortParam);
  return { results: data?.results || [] };
}

type SearchPageProps = {
  searchParams: Promise<{ q?: string; year?: string; minRating?: string; genre?: string; runtime?: string; language?: string; sort?: string }> | { q?: string; year?: string; minRating?: string; genre?: string; runtime?: string; language?: string; sort?: string };
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q, year, minRating, genre, runtime, language, sort } = await Promise.resolve(searchParams);
  const query = typeof q === "string" ? q.trim() : "";
  const releaseYear = typeof year === "string" ? year.trim() : "";
  const minimumRating = typeof minRating === "string" ? Number(minRating) : 0;
  const selectedGenre = typeof genre === "string" ? genre : "";
  const maxRuntime = typeof runtime === "string" ? runtime : "";
  const selectedLanguage = typeof language === "string" ? language : "";
  const selectedSort = typeof sort === "string" ? sort : "";
  const data = await searchMovies({
    query,
    year: releaseYear,
    genre: selectedGenre,
    minRating: minimumRating,
    maxRuntime,
    language: selectedLanguage,
    sort: selectedSort,
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
          <p className="text-red-500 text-sm font-bold uppercase tracking-widest mb-3">
            Search
          </p>
          <h1 className="text-4xl md:text-5xl font-bold">Find a Movie</h1>
          <p className="text-neutral-400 mt-3 max-w-2xl">
            Search by title or use filters to discover movies by genre, rating, runtime, language, and release year.
          </p>
        </header>

        <SearchHistory query={query} />

        <form action="/search" className="bg-neutral-900/50 border border-white/10 rounded-xl p-4 mb-10">
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
              placeholder="Release year"
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
              <option value="">Any genre</option>
              <option value="28">Action</option>
              <option value="35">Comedy</option>
              <option value="18">Drama</option>
              <option value="27">Horror</option>
              <option value="878">Sci-Fi</option>
              <option value="53">Thriller</option>
            </select>
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
              <option value="primary_release_date.desc">Newest</option>
              <option value="revenue.desc">Box office</option>
            </select>
          </div>
        </form>

        {!query && !releaseYear && !selectedGenre && !minimumRating && !maxRuntime && !selectedLanguage ? (
          <div className="border border-dashed border-white/10 rounded-xl p-10 text-center text-neutral-500">
            Type a movie title or choose filters to start discovering.
          </div>
        ) : movies.length === 0 ? (
          <div className="border border-dashed border-white/10 rounded-xl p-10 text-center text-neutral-500">
            No movies found for <span className="text-neutral-300">{query}</span>.
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-6">
              {query ? <>Results for <span className="text-red-500">{query}</span></> : "Discovery Results"}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {movies.map((movie) => (
                <Link
                  key={movie.id}
                  href={`/movie/${movie.id}`}
                  className="group relative block bg-neutral-900/60 border border-white/5 rounded-xl overflow-hidden hover:border-red-500/40 transition"
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

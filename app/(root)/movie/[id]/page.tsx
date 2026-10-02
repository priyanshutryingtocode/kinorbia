import { auth } from "@/auth";
import { notFound } from "next/navigation";
import type { TmdbMovieCredits, TmdbMovieDetails } from "@/types";
import type { Metadata } from "next";
import MediaDetailPage from "@/components/MediaDetailPage";
import {
  getMovieWithStatus,
  getMovieCredits,
  getMovieVideos,
  pickMainTrailer,
} from "@/lib/tmdb";
import {
  crewByJob,
  crewPanel,
  detailChips,
  detailSummary,
  runtimeChip,
  topCast,
} from "@/lib/mediaDetail";
import { yearOf } from "@/lib/media";
import { getPersonalMediaStatus } from "@/lib/profileData";

async function getMovieDetails(id: string): Promise<TmdbMovieDetails> {
  const { movie, notFound: missing } = await getMovieWithStatus(id);

  if (missing) {
    notFound();
  }

  if (!movie) {
    throw new Error("Failed to load movie");
  }

  return movie;
}

async function getCredits(id: string): Promise<TmdbMovieCredits> {
  const credits = await getMovieCredits(id);
  return credits || { id: Number(id), cast: [], crew: [] };
}

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const movie = await getMovieDetails(id);
  const year = yearOf(movie.release_date, "");

  return {
    title: `${movie.title}${year ? ` (${year})` : ""}`,
    description:
      movie.tagline ||
      (movie.overview ? movie.overview.slice(0, 160) : `Learn more about ${movie.title} on KinOrbia.`),
  };
}

export default async function MoviePage({ params }: Props) {
  const { id } = await params;
  const [movie, credits, videos, session] = await Promise.all([
    getMovieDetails(id),
    getCredits(id),
    getMovieVideos(id),
    auth(),
  ]);
  const trailer = pickMainTrailer(videos?.results);

  const personal = await getPersonalMediaStatus(session?.user?.email, id, "movie");

  return (
    <MediaDetailPage
      personal={personal}
      model={{
        id,
        mediaType: "movie",
        title: movie.title,
        tagline: movie.tagline,
        overview: movie.overview || "No overview is available for this movie yet.",
        kindLabel: "Film",
        releaseYear: yearOf(movie.release_date, "TBA"),
        releaseDate: movie.release_date,
        posterPath: movie.poster_path,
        backdropPath: movie.backdrop_path,
        chips: detailChips({
          voteAverage: movie.vote_average,
          releaseDate: movie.release_date,
          personalRating: personal.personalRating,
          mediumChip: runtimeChip(movie.runtime),
        }),
        cast: topCast(credits.cast),
        // crewByJob is an exact match on TMDB's `job`, so this pair catches the
        // plain "Director" and "Producer" credits only -- every Executive and
        // Co-Producer on the film is omitted. Left as-is for now; widening it
        // changes what every movie page shows, so it wants its own change.
        crew: [
          crewPanel("Director", crewByJob(credits.crew, "Director")),
          crewPanel("Producer", crewByJob(credits.crew, "Producer")),
        ].filter((panel) => panel !== null),
        summary: detailSummary({
          id: movie.id,
          title: movie.title,
          posterPath: movie.poster_path,
          voteAverage: movie.vote_average,
          releaseDate: movie.release_date,
          genreIds: movie.genres?.map((genre) => genre.id) || [],
          mediaType: "movie",
        }),
        trailerKey: trailer?.key ?? null,
      }}
    />
  );
}

import { auth } from "@/auth";
import { getPersonalMediaStatus } from "@/features/media/queries";
import { notFound } from "next/navigation";
import type { TmdbMovieCredits, TmdbMovieDetails } from "@/types";
import type { Metadata } from "next";
import MediaDetailPage from "@/components/MediaDetailPage";
import {
    getMovieWithStatus,
    getMovieCredits,
    getMovieProviders,
  hasWatchProviderData,
    getMovieVideos,
    pickMainTrailer,
    summarizeWatchProviders,
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
import { resolveWatchRegion } from "@/lib/region.server";


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

type Params = {
  params: Promise<{ id: string }>;
};

type Props = Params & {
  searchParams: Promise<{ region?: string }>;
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
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

export default async function MoviePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { region: requestedRegion } = await searchParams;
  const region = await resolveWatchRegion(requestedRegion);
    const [movie, credits, videos, providers, session] = await Promise.all([
      getMovieDetails(id),
      getCredits(id),
      getMovieVideos(id),
      // Where to stream is a nice-to-have on a page that already has the rest of the film
      // on it, so it rides along with the other TMDB reads rather than adding a round trip.
      getMovieProviders(id),
      auth(),
    ]);
    const trailer = pickMainTrailer(videos?.results);

  const personal = await getPersonalMediaStatus(session?.user?.email, id, "movie");
  // Whether to ask this member about sharing their activity -- only the first time.
  //
  // Read off the session, so it costs no query of its own. The flag says "has already been
  // asked", so the prompt is for the members who have NOT been asked: the old query returned
  // the flag itself, which is the opposite of what WatchedButton documents the prop to mean
  // ("true only the first time this member marks anything watched"). A signed-out visitor is
  // never asked.
  const askAboutSharing = Boolean(session?.user?.email) && !session?.user?.shareActivityAsked;

  return (
    <MediaDetailPage
      askAboutSharing={askAboutSharing}
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
        // crewByJob is an exact match on TMDB's `job`, catching plain "Director" and "Producer"
        // only -- Executive and Co-Producer are omitted. Widening changes every movie page,
        // so it wants its own change.
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
          watchProviders: summarizeWatchProviders(providers, region),
          watchProviderData: hasWatchProviderData(providers),
      }}
    />
  );
}

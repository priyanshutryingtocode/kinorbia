import { auth } from "@/auth";
import { notFound } from "next/navigation";
import type { TmdbTvCredits, TmdbTvDetails } from "@/types";
import type { Metadata } from "next";
import MediaDetailPage from "@/components/MediaDetailPage";
import {
  getTvWithStatus,
  getTvCredits,
  getTvVideos,
  pickMainTrailer,
} from "@/lib/tmdb";
import {
  detailChips,
  detailSummary,
  detailYear,
  seasonsChip,
  topCast,
} from "@/lib/mediaDetail";
import { getPersonalMediaStatus } from "@/lib/profileData";

async function getTvDetails(id: string): Promise<TmdbTvDetails> {
  const { tv, notFound: missing } = await getTvWithStatus(id);

  if (missing) {
    notFound();
  }

  if (!tv) {
    throw new Error("Failed to load show");
  }

  return tv;
}

async function getCredits(id: string): Promise<TmdbTvCredits> {
  const credits = await getTvCredits(id);
  return credits || { id: Number(id), cast: [], crew: [] };
}

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const tv = await getTvDetails(id);
  const year = tv.first_air_date ? tv.first_air_date.split("-")[0] : "";

  return {
    title: `${tv.name}${year ? ` (${year})` : ""}`,
    description:
      tv.tagline ||
      (tv.overview ? tv.overview.slice(0, 160) : `Learn more about ${tv.name} on KinOrbia.`),
  };
}

export default async function TvPage({ params }: Props) {
  const { id } = await params;
  const [tv, credits, videos, session] = await Promise.all([
    getTvDetails(id),
    getCredits(id),
    getTvVideos(id),
    auth(),
  ]);
  const trailer = pickMainTrailer(videos?.results);

  const personal = await getPersonalMediaStatus(session?.user?.email, id, "tv");

  return (
    <MediaDetailPage
      personal={personal}
      model={{
        id,
        mediaType: "tv",
        title: tv.name,
        tagline: tv.tagline,
        overview: tv.overview || "No overview is available for this show yet.",
        kindLabel: "Series",
        releaseYear: detailYear(tv.first_air_date),
        releaseDate: tv.first_air_date,
        posterPath: tv.poster_path,
        backdropPath: tv.backdrop_path,
        chips: detailChips({
          voteAverage: tv.vote_average,
          releaseDate: tv.first_air_date,
          personalRating: personal.personalRating,
          mediumChip: seasonsChip(tv.number_of_seasons),
        }),
        cast: topCast(credits.cast),
        crew: [],
        summary: detailSummary({
          id: tv.id,
          title: tv.name,
          posterPath: tv.poster_path,
          voteAverage: tv.vote_average,
          releaseDate: tv.first_air_date,
          genreIds: tv.genres?.map((genre) => genre.id) || [],
          mediaType: "tv",
        }),
        trailerKey: trailer?.key ?? null,
      }}
    />
  );
}

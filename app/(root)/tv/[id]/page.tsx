import { auth } from "@/auth";
import { getPersonalMediaStatus } from "@/features/media/queries";
import { notFound } from "next/navigation";
import type { TmdbTvCredits, TmdbTvDetails } from "@/types";
import type { Metadata } from "next";
import MediaDetailPage from "@/components/MediaDetailPage";
import {
  getTvWithStatus,
  getTvCredits,
  getTvVideos,
  getTvProviders,
  hasWatchProviderData,
  pickMainTrailer,
  summarizeWatchProviders,
} from "@/lib/tmdb";
import {
  creatorPanel,
  detailChips,
  detailSummary,
  networkPanel,
  seasonsChip,
  topCast,
} from "@/lib/mediaDetail";
import { yearOf } from "@/lib/media";
import { resolveWatchRegion } from "@/lib/region.server";


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

type Params = {
  params: Promise<{ id: string }>;
};

type Props = Params & {
  searchParams: Promise<{ region?: string }>;
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const tv = await getTvDetails(id);
  const year = yearOf(tv.first_air_date, "");

  return {
    title: `${tv.name}${year ? ` (${year})` : ""}`,
    description:
      tv.tagline ||
      (tv.overview ? tv.overview.slice(0, 160) : `Learn more about ${tv.name} on KinOrbia.`),
  };
}

export default async function TvPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { region: requestedRegion } = await searchParams;
  const region = await resolveWatchRegion(requestedRegion);
  const [tv, credits, videos, providers, session] = await Promise.all([
    getTvDetails(id),
    getCredits(id),
    getTvVideos(id),
    // Rides along with the other TMDB reads rather than adding a round trip; see the
    // movie page for why a missing answer here is not an error.
    getTvProviders(id),
    auth(),
  ]);
  const trailer = pickMainTrailer(videos?.results);

  const personal = await getPersonalMediaStatus(session?.user?.email, id, "tv");
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
        mediaType: "tv",
        title: tv.name,
        tagline: tv.tagline,
        overview: tv.overview || "No overview is available for this show yet.",
        kindLabel: "Series",
        releaseYear: yearOf(tv.first_air_date, "TBA"),
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
        // This used to be a bare `crew: []`, on the reasoning that a show has no equivalent of
        // a film's director. The payload disagrees: `created_by` and `networks` both arrive on
        // the `tv` fetch above and are each dropped. See creatorPanel below.
        crew: [creatorPanel(tv.created_by), networkPanel(tv.networks)].filter(
          (panel) => panel !== null
        ),
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
        watchProviders: summarizeWatchProviders(providers, region),
        watchProviderData: hasWatchProviderData(providers),
      }}
    />
  );
}

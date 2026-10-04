import type { MediaType, TmdbCredit, TmdbTvCreator, TmdbTvDetails } from "@/types";
import { normalizeMediaType, starsLabel } from "@/lib/media";

export type DetailIcon = "star" | "star-filled" | "calendar" | "clock" | "layers";

export type DetailChip = {
  key: string;
  icon: DetailIcon;
  label: string;
  accent?: boolean;
};

type DetailCrew = {
  label: string;
  names: string;
};

export type DetailSummary = {
  id: string;
  title: string;
  poster_path: string | null;
  vote_average: number;
  release_date?: string;
  genre_ids?: number[];
  mediaType?: MediaType;
};

export type DetailModel = {
  id: string;
  mediaType: "movie" | "tv";
  title: string;
  tagline: string;
  overview: string;
  kindLabel: string;
  releaseYear: string;
  releaseDate: string;
  posterPath: string | null;
  backdropPath: string | null;
  chips: DetailChip[];
  cast: TmdbCredit[];
  crew: DetailCrew[];
  summary: DetailSummary;
  trailerKey: string | null;
};


function ratingChip(voteAverage: number | undefined): DetailChip {
  return {
    key: "rating",
    icon: "star-filled",
    label: typeof voteAverage === "number" ? voteAverage.toFixed(1) : "N/A",
  };
}

function releaseDateChip(releaseDate: string | undefined): DetailChip {
  return { key: "release-date", icon: "calendar", label: releaseDate || "Release date TBA" };
}

function yourRatingChip(personalRating: number): DetailChip | null {
  if (personalRating <= 0) {
    return null;
  }

  return {
    key: "your-rating",
    icon: "star",
    accent: true,
    label: `Your ${starsLabel(personalRating)} stars`,
  };
}

export function runtimeChip(runtime: number | undefined): DetailChip {
  const total = typeof runtime === "number" ? runtime : 0;

  return {
    key: "runtime",
    icon: "clock",
    label: total > 0 ? `${Math.floor(total / 60)}h ${total % 60}m` : "Runtime TBA",
  };
}

export function seasonsChip(numberOfSeasons: number | null | undefined): DetailChip | null {
  if (numberOfSeasons == null) {
    return null;
  }

  return {
    key: "seasons",
    icon: "layers",
    label: `${numberOfSeasons} ${numberOfSeasons === 1 ? "season" : "seasons"}`,
  };
}

export function detailChips(options: {
  voteAverage: number | undefined;
  releaseDate: string | undefined;
  personalRating: number;
  mediumChip?: DetailChip | null;
}): DetailChip[] {
  return [
    ratingChip(options.voteAverage),
    options.mediumChip ?? null,
    releaseDateChip(options.releaseDate),
    yourRatingChip(options.personalRating),
  ].filter((chip): chip is DetailChip => chip !== null);
}

export function topCast(cast: TmdbCredit[]): TmdbCredit[] {
  return [...cast].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).slice(0, 6);
}

export function crewByJob(crew: TmdbCredit[], job: "Director" | "Producer"): TmdbCredit[] {
  return crew.filter((member) => member.job === job);
}

export function crewPanel(label: string, members: TmdbCredit[]): DetailCrew | null {
  if (members.length === 0) {
    return null;
  }

  return {
    label: `${label}${members.length > 1 ? "s" : ""}`,
    names: members.map((member) => member.name).join(", "),
  };
}

export function creatorPanel(creators: TmdbTvCreator[] | undefined): DetailCrew | null {
  if (!creators || creators.length === 0) {
    return null;
  }

  return {
    label: `Creator${creators.length > 1 ? "s" : ""}`,
    names: creators.map((creator) => creator.name).join(", "),
  };
}

export function networkPanel(networks: TmdbTvDetails["networks"]): DetailCrew | null {
  if (!networks || networks.length === 0) {
    return null;
  }

  return {
    label: "Network",
    names: networks.map((network) => network.name).join(", "),
  };
}

export function detailSummary(details: {
  id: number | string;
  title: string;
  posterPath: string | null;
  voteAverage: number;
  releaseDate?: string;
  genreIds: number[];
  mediaType: string | null | undefined;
}): DetailSummary {
  return {
    id: String(details.id),
    title: details.title,
    poster_path: details.posterPath,
    vote_average: details.voteAverage || 0,
    release_date: details.releaseDate,
    genre_ids: details.genreIds,
    mediaType: normalizeMediaType(details.mediaType),
  };
}

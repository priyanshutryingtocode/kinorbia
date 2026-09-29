import type { MediaType, TmdbCredit } from "@/types";
import { normalizeMediaType } from "@/lib/media";

// The film and show detail pages were two near-copies of one layout, which is
// how the overline token came to be spelled two different ways on the same
// element. This module holds the parts that genuinely differ between the two
// media types; components/MediaDetailPage owns the markup they share.
//
// Everything here is a pure function of the TMDB payload, so the per-media
// differences can be exercised without a database or a render.

// Icons are named rather than rendered so this stays free of JSX, and so the
// icon set lives in one place next to the markup that picks it.
export type DetailIcon = "star" | "star-filled" | "calendar" | "clock" | "layers";

export type DetailChip = {
  key: string;
  icon: DetailIcon;
  label: string;
  // The signed-in user's own rating is highlighted rather than presented as
  // another piece of metadata.
  accent?: boolean;
};

export type DetailCrew = {
  label: string;
  names: string;
};

// The favorite, watched, watchlist, and rating controls each declare their own
// structural prop type rather than sharing a named one, so this is the common
// denominator. `id` is a string here, where MovieSummary allows a number,
// because the TMDB ids reach these controls as route params.
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
  // "Film" or "Series", rendered in the overline beside the year.
  kindLabel: string;
  releaseYear: string;
  releaseDate: string;
  posterPath: string | null;
  backdropPath: string | null;
  // Rating first, then whatever the medium adds, then the release date. A
  // value the medium does not have is simply an absent chip, rather than a
  // conditional in the markup.
  chips: DetailChip[];
  cast: TmdbCredit[];
  // Films list their director and producers; shows have no equivalent.
  crew: DetailCrew[];
  // The shape the favorite, watched, watchlist, and rating controls expect.
  summary: DetailSummary;
  trailerKey: string | null;
};

export function detailYear(date: string | undefined): string {
  return date ? date.split("-")[0] : "TBA";
}

export function ratingChip(voteAverage: number | undefined): DetailChip {
  return {
    key: "rating",
    icon: "star-filled",
    label: typeof voteAverage === "number" ? voteAverage.toFixed(1) : "N/A",
  };
}

export function releaseDateChip(releaseDate: string | undefined): DetailChip {
  return { key: "release-date", icon: "calendar", label: releaseDate || "Release date TBA" };
}

export function yourRatingChip(personalRating: number): DetailChip | null {
  if (personalRating <= 0) {
    return null;
  }

  return {
    key: "your-rating",
    icon: "star",
    accent: true,
    label: `Your ${(personalRating / 2).toFixed(1)} stars`,
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

// Rating first, then the medium-specific chip if it has one, then the date, so
// both media types read the same way across the row.
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

// The film payload and the show payload use different keys for the same two
// facts, so both are mapped here and the model below is media-agnostic.
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

import type { MediaType } from "@/types";

export function normalizeMediaType(mediaType: string | null | undefined): MediaType {
  return mediaType === "tv" ? "tv" : "movie";
}

export function mediaKey(mediaType: string | null | undefined, id: string | number | undefined) {
  return `${normalizeMediaType(mediaType)}:${id}`;
}

export function tmdbImage(path: string | null | undefined, size: string) {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}

export function mediaMatch(mediaType: MediaType) {
  if (mediaType === "tv") {
    return { mediaType: "tv" };
  }

  return { mediaType: { $in: ["movie", null] } };
}

export function mediaEquals(mediaType: MediaType) {
  if (mediaType === "tv") {
    return "tv";
  }

  return { $in: ["movie", null] };
}

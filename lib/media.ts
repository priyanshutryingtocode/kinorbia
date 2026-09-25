import type { MediaType } from "@/types";

export function normalizeMediaType(mediaType: string | null | undefined): MediaType {
  return mediaType === "tv" ? "tv" : "movie";
}

export function mediaKey(mediaType: string | null | undefined, id: string | number | undefined) {
  return `${normalizeMediaType(mediaType)}:${id}`;
}

export function mediaHref(mediaType: string | null | undefined, id: string | number) {
  return normalizeMediaType(mediaType) === "tv" ? `/tv/${id}` : `/movie/${id}`;
}

export function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function tmdbImage(path: string | null | undefined, size: string) {
  const value = path?.trim();
  if (!value) {
    return null;
  }

  const candidate = value.startsWith("//") ? `https:${value}` : value;

  if (/^https?:\/\//i.test(candidate)) {
    try {
      const url = new URL(candidate);
      if (url.hostname !== "image.tmdb.org") {
        return null;
      }

      const match = url.pathname.match(/^\/t\/p\/[^/]+\/(.+)$/);
      if (!match) {
        return null;
      }

      return `https://image.tmdb.org/t/p/${size}/${match[1]}`;
    } catch {
      return null;
    }
  }

  const relative = value.replace(/^\/+/, "").replace(/^t\/p\/[^/]+\//, "");
  return relative ? `https://image.tmdb.org/t/p/${size}/${relative}` : null;
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
